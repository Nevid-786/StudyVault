

export default class SubjectService {

    static async addSubject(semester, name) {
        try {
            const req = indexedDB.open("studyVault", 1);
            const payload = {
                semester, name: name,
                units: [
                ],
            }
            req.onsuccess = (e) => {
                const db = req.result;
                const tx = db.transaction("subject", "readwrite");
                const store = tx.objectStore("subject");
                const res = store.add(payload);

                res.onsuccess = () => {
                    console.log(res.result)
                }
            }
            req.onerror = (e) => {
                console.error("Error opening database:", req.error);
            }
        } catch (error) {
            console.log(error);

        }

    }
    static async addUnit(subjectname, title, number) {
        console.log("adding unit:", subjectname, title, number)
        try {
            const req = indexedDB.open("studyVault", 1);
            let result;
            req.onsuccess = (e) => {
                const db = req.result;
                const tx = db.transaction("subject", "readwrite");
                const store = tx.objectStore("subject");
                const res = store.index("by_name").get(subjectname);
                res.onsuccess = () => {
                    const subject = res.result;
                    console.log("subject found:",subject)
                    const payload = {
                        title: title,
                        number: number,
                    }
                    if (subject) {
                        subject.units.push(payload);
                        const updateReq = store.put(subject)
                        updateReq.onsuccess = () => {
                            result = updateReq.result;
                            console.log("unit added")
                        }
                         updateReq.onerror=()=>console.log(updateReq.error);
                    }
                }
                 res.onerror=()=>console.log(res.error);
          
               
            }
                  req.onerror=()=>console.log(req.error);
                   return result;
        } catch (error) {
            console.log(error)

        }

    }

    static async getAllSubjects() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open("studyVault", 1);

            req.onerror = () => reject(req.error);
            req.onsuccess = () => {
                const db = req.result;
                let tx;

                try {
                    tx = db.transaction("subject", "readonly");
                } catch (error) {
                    db.close();
                    reject(error);
                    return;
                }

                const res = tx.objectStore("subject").getAll();
                res.onsuccess = () => resolve(res.result);
                res.onerror = () => reject(res.error);
                tx.oncomplete = () => db.close();
                tx.onabort = () => {
                    db.close();
                    reject(tx.error);
                };
            };
        });
    }


 static async uploadFile(subjectname) {

 }
}