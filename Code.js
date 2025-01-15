function doGet() {
  const template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
      .setTitle('עץ משפחה')
      .setFaviconUrl('https://www.google.com/favicon.ico')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getData() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getActiveSheet();
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // Get headers
    const headers = values[0];
    
    // Column indexes (0-based, from right to left)
    const idIndex = 0;            // A - מזהה
    const firstNameIndex = 1;     // B - שם פרטי
    const lastNameIndex = 2;      // C - שם משפחה
    const gregDateIndex = 3;      // D - תאריך לידה
    const hebrewDateIndex = 4;    // E - תאריך לידה עברי
    const gregDeathDateIndex = 9; // J - תאריך פטירה
    const hebrewDeathDateIndex = 10; // K - תאריך פטירה עברי
    const fatherIdIndex = 12;     // M - אבא
    const motherIdIndex = 13;     // N - אמא
    const spouseIdIndex = 14;     // O - בן/בת זוג
    const marriageDateIndex = 15; // P - תאריך נישואין
    const hideIndex = 16;         // Q - לא להציג
    
    // Create maps for people and relationships
    const peopleMap = new Map();
    const childrenByParent = new Map();
    
    // First pass: Create people map - add everyone
    values.slice(1).forEach(row => {
      const id = row[idIndex]?.toString();
      if (id) {
        // Debug logging for couples
        const spouseId = row[spouseIdIndex]?.toString();
        if (spouseId) {
          console.log(`\nChecking couple:`);
          console.log(`Person ID: ${id}`);
          console.log(`Name: ${row[firstNameIndex]} ${row[lastNameIndex]}`);
          console.log(`Spouse ID: ${spouseId}`);
          console.log(`Marriage Date (Column P): ${row[marriageDateIndex]}`);
          console.log(`Marriage Date type: ${typeof row[marriageDateIndex]}`);
          console.log(`Marriage Date raw value:`, row[marriageDateIndex]);
        }
        
        peopleMap.set(id, {
          id: id,
          firstName: row[firstNameIndex],
          lastName: row[lastNameIndex],
          fatherId: row[fatherIdIndex]?.toString(),
          motherId: row[motherIdIndex]?.toString(),
          spouseId: row[spouseIdIndex]?.toString(),
          marriageDate: row[marriageDateIndex],
          hebrewDate: row[hebrewDateIndex],
          gregorianDate: row[gregDateIndex],
          hebrewDeathDate: row[hebrewDeathDateIndex],
          gregorianDeathDate: row[gregDeathDateIndex],
          isHidden: row[hideIndex] === "HIDE"
        });
      }
    });
    
    // Second pass: Build parent-child relationships
    peopleMap.forEach(person => {
      console.log(`\nChecking person: ${person.firstName} ${person.lastName} (ID: ${person.id})`);
      console.log(`Father ID: ${person.fatherId}, Mother ID: ${person.motherId}`);
      
      if (person.fatherId) {
        if (!childrenByParent.has(person.fatherId)) {
          childrenByParent.set(person.fatherId, new Set());
        }
        childrenByParent.get(person.fatherId).add(person.id);
        console.log(`Added as child to father ID: ${person.fatherId}`);
      }
      if (person.motherId) {
        if (!childrenByParent.has(person.motherId)) {
          childrenByParent.set(person.motherId, new Set());
        }
        childrenByParent.get(person.motherId).add(person.id);
        console.log(`Added as child to mother ID: ${person.motherId}`);
      }
    });
    
    // Log the childrenByParent map for debugging
    console.log('\nComplete children map:');
    childrenByParent.forEach((children, parentId) => {
      const parent = peopleMap.get(parentId);
      if (parent) {
        console.log(`\nParent: ${parent.firstName} ${parent.lastName} (ID: ${parentId})`);
        console.log('Children IDs:', Array.from(children));
      }
    });
    
    // Calculate relationships for each person
    const data = Array.from(peopleMap.values())
      .filter(person => !person.isHidden)
      .map(person => {
        // Get spouse info
        const spouse = person.spouseId ? peopleMap.get(person.spouseId) : null;
        
        // Get children
        const children = Array.from(childrenByParent.get(person.id) || [])
          .map(childId => {
            const child = peopleMap.get(childId);
            return child ? {
              id: childId,
              name: `${child.firstName} ${child.lastName}`
            } : null;
          })
          .filter(child => child !== null);
        
        // Get siblings
        const fatherSiblings = person.fatherId ? 
          Array.from(childrenByParent.get(person.fatherId) || []) : [];
        const motherSiblings = person.motherId ? 
          Array.from(childrenByParent.get(person.motherId) || []) : [];
        
        const siblingIds = new Set([...fatherSiblings, ...motherSiblings]
          .filter(id => id !== person.id));
        
        const siblings = {
          fullSiblings: [],
          halfSiblings: []
        };
        
        siblingIds.forEach(siblingId => {
          const sibling = peopleMap.get(siblingId);
          if (sibling) {
            if (sibling.motherId === person.motherId && sibling.fatherId === person.fatherId) {
              siblings.fullSiblings.push({
                id: siblingId,
                name: `${sibling.firstName} ${sibling.lastName}`
              });
            } else {
              siblings.halfSiblings.push({
                id: siblingId,
                name: `${sibling.firstName} ${sibling.lastName}`,
                relationship: sibling.motherId === person.motherId ? 'מאם' : 'מאב'
              });
            }
          }
        });
        
        return {
          ...person,
          parents: {
            father: person.fatherId ? `${peopleMap.get(person.fatherId)?.firstName || ''} ${peopleMap.get(person.fatherId)?.lastName || ''}` : null,
            mother: person.motherId ? `${peopleMap.get(person.motherId)?.firstName || ''} ${peopleMap.get(person.motherId)?.lastName || ''}` : null
          },
          spouse: spouse ? `${spouse.firstName} ${spouse.lastName}` : null,
          children: children,
          siblings: siblings
        };
      });
    
    return data;
  }
  
const COLUMNS = {
  ID: 1,            // A - מזהה
  FIRST_NAME: 2,    // B - שם פרטי
  LAST_NAME: 3,     // C - שם משפחה
  GREG_DATE: 4,     // D - תאריך לידה
  HEBREW_DATE: 5,   // E - תאריך לידה עברי
  GREG_DEATH: 10,   // J - תאריך פטירה
  HEBREW_DEATH: 11, // K - תאריך פטירה עברי
  FATHER_ID: 13,    // M - אבא
  MOTHER_ID: 14,    // N - אמא
  SPOUSE_ID: 15,    // O - בן/בת זוג
  MARRIAGE_DATE: 16,// P - תאריך נישואין
  HIDE: 17          // Q - לא להציג
};

function addPerson(formData) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getActiveSheet();
    
    console.log("Adding new person with data:", formData);
    console.log("Relationship type:", formData.relationshipType);
    
    // Generate new ID
    let newId;
    do {
        newId = Math.floor(100000000 + Math.random() * 900000000).toString();
    } while (isIdExists(newId, sheet));
    
    console.log("Generated new ID:", newId);

    // Create new row with 17 columns (A through Q)
    const newRow = new Array(17).fill(null);
    
    // Log each value being set
    console.log("Setting values to columns:");
    console.log(`Column ${COLUMNS.ID} (A): ${newId}`);
    console.log(`Column ${COLUMNS.FIRST_NAME} (B): ${formData.firstName}`);
    console.log(`Column ${COLUMNS.LAST_NAME} (C): ${formData.lastName}`);
    console.log(`Column ${COLUMNS.GREG_DATE} (D): ${formData.gregDate}`);
    console.log(`Column ${COLUMNS.HEBREW_DATE} (E): ${formData.hebrewDate}`);
    
    // Set basic information
    newRow[COLUMNS.ID - 1] = newId;
    newRow[COLUMNS.FIRST_NAME - 1] = formData.firstName;
    newRow[COLUMNS.LAST_NAME - 1] = formData.lastName;     // Add this line
    newRow[COLUMNS.GREG_DATE - 1] = formData.gregDate || "";
    newRow[COLUMNS.HEBREW_DATE - 1] = formData.hebrewDate || "";
    newRow[COLUMNS.EMAIL - 1] = formData.email || "";
    newRow[COLUMNS.PHONE - 1] = formData.phone || "";
    
    if (formData.relationshipType === 'spouse') {
        console.log(`Setting spouse ID in column ${COLUMNS.SPOUSE_ID} (O): ${formData.relatedPersonId}`);
        console.log(`Setting marriage date in column ${COLUMNS.MARRIAGE_DATE} (P): ${formData.marriageDate}`);
        
        newRow[COLUMNS.SPOUSE_ID - 1] = formData.relatedPersonId;
        newRow[COLUMNS.MARRIAGE_DATE - 1] = formData.marriageDate || "";
        
        try {
            // Try to update spouse's record
            console.log("Updating spouse's record...");
            updateSpouseRecord(formData.relatedPersonId, newId, formData.marriageDate, sheet);
            console.log("Spouse record updated successfully");
        } catch (error) {
            console.error("Error updating spouse record:", error);
        }
    }
    
    if (formData.relationshipType === 'sibling') {
        // Get the existing sibling's data to copy their parents
        const allPeople = getData();
        const sibling = allPeople.find(p => p.id === formData.relatedPersonId);
        
        if (sibling) {
            console.log("Found existing sibling:", sibling);
            console.log("Copying parent IDs:", {
                fatherId: sibling.fatherId,
                motherId: sibling.motherId
            });
            
            // Copy parents' IDs to the new row
            if (sibling.fatherId) {
                newRow[COLUMNS.FATHER_ID - 1] = sibling.fatherId;
                console.log(`Set father ID in column ${COLUMNS.FATHER_ID}: ${sibling.fatherId}`);
            }
            if (sibling.motherId) {
                newRow[COLUMNS.MOTHER_ID - 1] = sibling.motherId;
                console.log(`Set mother ID in column ${COLUMNS.MOTHER_ID}: ${sibling.motherId}`);
            }
        } else {
            console.warn("Could not find existing sibling with ID:", formData.relatedPersonId);
        }
    }
    
    if (formData.relationshipType === 'child') {
        const parentId = formData.relatedPersonId;
        console.log("Adding child to parent ID:", parentId);
        
        // Get parent's data
        const allPeople = getData();
        const parent = allPeople.find(p => p.id === parentId);
        
        if (parent) {
            console.log("Found parent:", parent);
            
            // Check if this parent appears as father in any existing records
            const values = sheet.getDataRange().getValues();
            const isFather = values.some(row => row[COLUMNS.FATHER_ID - 1]?.toString() === parentId);
            
            if (isFather) {
                console.log("Setting as father in column M");
                newRow[COLUMNS.FATHER_ID - 1] = parentId;
                
                // If parent has spouse, set as mother
                if (parent.spouseId) {
                    console.log("Setting spouse as mother in column N:", parent.spouseId);
                    newRow[COLUMNS.MOTHER_ID - 1] = parent.spouseId;
                }
            } else {
                console.log("Setting as mother in column N");
                newRow[COLUMNS.MOTHER_ID - 1] = parentId;
                
                // If parent has spouse, set as father
                if (parent.spouseId) {
                    console.log("Setting spouse as father in column M:", parent.spouseId);
                    newRow[COLUMNS.FATHER_ID - 1] = parent.spouseId;
                }
            }
        } else {
            console.warn("Could not find parent with ID:", parentId);
        }
    }
    
    if (formData.relationshipType === 'parent') {
        const parentType = formData.parentType;
        const relatedPersonId = formData.relatedPersonId;
        console.log("Adding parent:", parentType, "to person ID:", relatedPersonId);

        // Get related person's data
        const allPeople = getData();
        const relatedPerson = allPeople.find(p => p.id === relatedPersonId);
        
        if (relatedPerson) {
            // Set the new parent ID in the related person's record
            const rowNumber = findRowByPersonId(relatedPersonId, sheet);
            if (parentType === 'father') {
                sheet.getRange(rowNumber, COLUMNS.FATHER_ID).setValue(newId);
            } else {
                sheet.getRange(rowNumber, COLUMNS.MOTHER_ID).setValue(newId);
            }

            // Update siblings if they exist
            const siblings = allPeople.filter(p => 
                (p.fatherId === relatedPerson.fatherId && relatedPerson.fatherId) || 
                (p.motherId === relatedPerson.motherId && relatedPerson.motherId)
            );

            siblings.forEach(sibling => {
                const siblingRow = findRowByPersonId(sibling.id, sheet);
                if (siblingRow && sibling.id !== relatedPersonId) {
                    if (parentType === 'father') {
                        sheet.getRange(siblingRow, COLUMNS.FATHER_ID).setValue(newId);
                    } else {
                        sheet.getRange(siblingRow, COLUMNS.MOTHER_ID).setValue(newId);
                    }
                }
            });
        }
    }
    
    console.log("Final row data to be inserted:", newRow);
    
    try {
        sheet.appendRow(newRow);
        console.log("Row added successfully");
        return newId;
    } catch (error) {
        console.error("Error appending row:", error);
        throw error;
    }
}

function updateSpouseRecord(spouseId, newPersonId, marriageDate, sheet) {
    console.log("Updating spouse record with:", {
        spouseId,
        newPersonId,
        marriageDate
    });
    
    const data = sheet.getDataRange().getValues();
    
    // Find spouse's row
    for (let i = 1; i < data.length; i++) {
        if (data[i][0].toString() === spouseId) {
            const rowNumber = i + 1;
            console.log(`Found spouse row: ${rowNumber}`);
            
            // Update spouse's record
            try {
                sheet.getRange(rowNumber, COLUMNS.SPOUSE_ID).setValue(newPersonId);
                console.log(`Updated spouse ID in column ${COLUMNS.SPOUSE_ID}`);
                
                if (marriageDate) {
                    sheet.getRange(rowNumber, COLUMNS.MARRIAGE_DATE).setValue(marriageDate);
                    console.log(`Updated marriage date in column ${COLUMNS.MARRIAGE_DATE}`);
                }
            } catch (error) {
                console.error("Error updating spouse cells:", error);
                throw error;
            }
            break;
        }
    }
}

function isIdExists(id, sheet) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) { // Skip the header row
    if (data[i][0] === id) {
      return true;
    }
  }
  return false;
}

function findRowByPersonId(personId, sheet) {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
        if (data[i][0].toString() === personId) {
            return i + 1;  // Adding 1 because array is 0-based but sheet rows are 1-based
        }
    }
    return null;
}