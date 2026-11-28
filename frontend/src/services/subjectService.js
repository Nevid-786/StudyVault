

import IndexDB from "../config/indexdb.js";

export default class SubjectService extends IndexDB {

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


    static async deleteSubject(subjectname) {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open("studyVault", 1);

            req.onerror = () => reject(req.error);
            req.onsuccess = () => {
                const db = req.result;
                let tx;

                try {
                    tx = db.transaction("subject", "readwrite");
                } catch (error) {
                    db.close();
                    reject(error);
                    return;
                }

                const store = tx.objectStore("subject");
                const getReq = store.index("by_name").getKey(subjectname);
                let deleted = false;

                getReq.onsuccess = () => {
                    if (getReq.result !== undefined) {
                        deleted = true;
                        store.delete(getReq.result);
                    }
                };
                getReq.onerror = () => reject(getReq.error);
                tx.oncomplete = () => {
                    db.close();
                    if (deleted) resolve(true);
                    else reject(new Error(`Subject "${subjectname}" not found`));
                };
                tx.onabort = () => {
                    db.close();
                    reject(tx.error);
                };
            };
        });
    }

    static async deleteUnit(subjectname, number) {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open("studyVault", 1);

            req.onerror = () => reject(req.error);
            req.onsuccess = () => {
                const db = req.result;
                const tx = db.transaction("subject", "readonly");
                const store = tx.objectStore("subject");
                const res = store.index("by_name").get(subjectname);

                res.onsuccess = () => {
                    const subject = res.result;
                    if (!subject) {
                        db.close();
                        reject(new Error(`Subject "${subjectname}" not found`));
                        return;
                    }

                    const unit = subject.units.find((item) => item.number === number);
                    if (!unit) {
                        db.close();
                        reject(new Error(`Unit "${number}" not found`));
                        return;
                    }

                    const files = Array.isArray(unit.files)
                        ? unit.files
                        : unit.file ? [unit.file] : [];

                    tx.oncomplete = async () => {
                        db.close();
                        try {
                            for (const file of files) {
                                await this.deleteFile(file);
                            }

                            const updateReq = indexedDB.open("studyVault", 1);
                            updateReq.onerror = () => reject(updateReq.error);
                            updateReq.onsuccess = () => {
                                const updateDb = updateReq.result;
                                const updateTx = updateDb.transaction("subject", "readwrite");
                                const updateStore = updateTx.objectStore("subject");
                                const subjectReq = updateStore.index("by_name").get(subjectname);

                                subjectReq.onsuccess = () => {
                                    const currentSubject = subjectReq.result;
                                    if (!currentSubject) {
                                        updateDb.close();
                                        reject(new Error(`Subject "${subjectname}" not found`));
                                        return;
                                    }
                                    currentSubject.units = currentSubject.units.filter(
                                        (item) => item.number !== number
                                    );
                                    updateStore.put(currentSubject);
                                };
                                subjectReq.onerror = () => reject(subjectReq.error);
                                updateTx.oncomplete = () => {
                                    updateDb.close();
                                    resolve(true);
                                };
                                updateTx.onabort = () => {
                                    updateDb.close();
                                    reject(updateTx.error);
                                };
                            };
                        } catch (error) {
                            reject(error);
                        }
                    };
                };

                res.onerror = () => reject(res.error);
                tx.onabort = () => {
                    db.close();
                    reject(tx.error);
                };
            };
        });
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
                    console.log("subject found:", subject)
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
                        updateReq.onerror = () => console.log(updateReq.error);
                    }
                }
                res.onerror = () => console.log(res.error);


            }
            req.onerror = () => console.log(req.error);
            return result;
        } catch (error) {
            console.log(error)

        }

    }
    static async createSubAndUnitSync(dfiles) {
        const subjectsFromDownload = dfiles.map((file) => file.appProperties);
        const AllsubjectsFromlocal = await this.getAllSubjects();
        const semestersFromlocal = new Set(AllsubjectsFromlocal.map((subject) => subject.semester));
        const unitsFromlocal = AllsubjectsFromlocal.flatMap((subject) => [...subject.units]);
        const subjectsFromlocal = AllsubjectsFromlocal.map((subject) => subject.name);

        // console.log("Semesters from local:", semestersFromlocal);
        // console.log("Units from local:", unitsFromlocal);
        // console.log("Subjects from local:", subjectsFromlocal);


        const subjectstoCreate = subjectsFromDownload.filter((file) => {
            const subjectName = file.subject;
            return !subjectsFromlocal.some((subject) => subject.name === subjectName);
        });
        // console.table(subjectstoCreate)
        const uniqueRecords = [
            ...new Map(
                subjectstoCreate.map(obj => [
                    `${obj.semester}|${obj.subject}|${obj.unit}`,
                    obj
                ])
            ).values()
        ];

        uniqueRecords.forEach((record) => {
            const { semester, subject, unit } = record;
            if (!unitsFromlocal.some((u) => u.title === unit)) {
                if (!subjectsFromlocal.includes(subject)) {
                    // console.log("Adding subject:", semester, subject)
                    
                    this.addSubject(semester, subject);
                    subjectsFromlocal.push(subject);
                    // console.log("new subjectsfromlocal:", subjectsFromlocal)

                }
                this.addUnit(subject, unit, Number(unit));
                unitsFromlocal.push({ number: Number(unit), title: unit });
            }

           
        });

        const req = indexedDB.open("studyVault", 1);
        req.onerror = () => reject(req.error);
        req.onsuccess = async () => {
            const db = req.result;
            let tx;
            try {

            } catch (error) {
                db.close();
                reject(error);
                return;
            }
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



}