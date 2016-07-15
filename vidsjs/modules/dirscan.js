﻿'use strict';
var models = require('../models');
var utils = require('./utils');
var items = require('./items');

var pathJS = require('path');
var fs = require('fs');

var basePath = '';
var mime = require('mime');

/*
    * Checks wether file has mime type of video/<type>
    * file = File to check
*/
function checkType(file) {
    let type = mime.lookup(file);
    let leftSide = type.split('/');
    if(leftSide[0] === "video") {
        return true;
    }
    return false;
}

/*
    * Checks wether file has mime type of
    * file = File to check
*/
function checkSubrip(file) {
    let type = mime.lookup(file);
    let requiredType = "application/x-subrip";
    if(type === requiredType) {
        return true;
    }
    return false;
}

/*
    * Deletes items from database table items and users_data which cannot be found in directory structure
    * uid      = User id
    * itemList = List of items
*/
function deleteMissingItems(uid, itemList) {
    return new Promise(function (resolve, reject) {
        if (itemList.items.length > 0) {
            for (let i in itemList.items) {
                models.physical_items.destroy({ where: { id: itemList.items[i].id }, limit: 1 });
                models.virtual_items.destroy({ where: { iid: itemList.items[i].id, uid: uid}, limit: 1 });
            }
            itemList.items.length = 0;
            resolve(true);
        }
        else {
            resolve(false);
        }
    });
}

/*
    * Fills item list with items from database
    * uid = User id
*/
function init(uid) {
    return new Promise(function (resolve, reject) {
        utils.getPath(uid).then(function (data) {
            basePath = data;
        });
        resolve(true);
    });
}

/*
    * Returns items from database for all paths
    * upid = Id from basePath variable (id field from user_settings)
*/
function getUserItems(upid) {
    return new Promise(function (resolve, reject) {
        models.physical_items.findAll({ where: { upid: upid} }).then(function (allitems) {
            let tmplist = new items();
            allitems.map(function (obj) {
                tmplist.addItem({ path: obj.path, id: obj.id });
            });
            resolve(tmplist);
        });
    });
}

/*
    * Fills Item List array with items from users_data and returns it
*/
function fillItemList() {
    return new Promise(function (resolve, reject) {
        let promiseArray = Array();
        for(let i in basePath) {
            promiseArray.push(getUserItems(basePath[i].id));
        }

        Promise.all(promiseArray).then(function (data) {
            var itemList = new items();
            for (let i in data) {
                data[i].items.map(function (obj) {
                    itemList.addItem({ path: obj.path, id: obj.id });
                });
            }

            resolve(itemList);
        });
    });
}

/*
    * Reads directory
    * path     = Path to directory
    * level    = Parent id in database (0 for first call)
    * itemList = List of items in db (generated by fillItemList)
    * upid     = Id of folder from users_settings
    * uid      = User id
    * udid     = Id from user_data row
*/
function readDir(path, level, itemList, upid, uid, udid) {
    var folderArray = Array();
    return new Promise(function (resolve, reject) {
        path = path.concat(pathJS.sep);
        var cycle = new Promise(function (resolve, reject) {
            fs.stat(path, function(err, stats) {
                if(err !== null) {
                    reject(err);
                }
                let data = fs.readdirSync(path);
                for (let i in data) {
                    let newPath = path.concat(data[i]);

                    try {
                        let stats = fs.statSync(newPath);
                        if (stats.isDirectory()) {
                            //TODO: make this part easier to understand
                            itemList.removeItem({ path: newPath }).then(function (msg) {
                                folderArray.push(readDir(newPath, parseInt(msg), itemList, upid, uid, udid));
                            }).catch(function (msg) {
                                models.physical_items.create({ name: data[i], pid: level, type: 0, path: newPath, upid: upid }).then(function (createditem) {
                                    let newlevel = createditem.id;

                                    models.virtual_items.create({ uid: uid, name: data[i], iid: newlevel, seen: 0, deleted: 0, pid: udid, type: 0 })
                                    .then(function (createditem2) {
                                        folderArray.push(readDir(newPath, newlevel, itemList, upid, uid, createditem2.id));
                                    });
                                });
                            });
                        }
                        else {
                            if (checkType(data[i])) {
                                itemList.removeItem({ path: newPath }).catch(function (msg) {
                                    let tmp = pathJS.parse(data[i]);
                                    models.physical_items.create({ name: tmp.name, pid: level, type: 1, path: newPath, upid: upid }).then(function (createditem) {
                                        let newlevel = createditem.id;
                                        models.virtual_items.create({ uid: uid, name: tmp.name, iid: newlevel, seen: 0, deleted: 0, pid: udid, type: 1 });
                                        models.physical_items_mimes.create({iid: newlevel, mime: mime.lookup(data[i])});
                                    });
                                });
                            }
                            else if(checkSubrip(data[i])){
                                //TODO: consider this doing after all videos have been indexed.
                                /*let tmp = pathJS.parse(data[i]);
                                models.physical_items.find({ where: {name: tmp.name, type: 1}}).then(function (foundItem) {
                                    if(foundItem === null) {
                                        //add message to system_messages
                                        console.log("srt file name doesnt match any video name! (might be found before video name :S)");
                                    }
                                });*/
                                //TODO: FIX THiS
                                //check other types aswell
                                //set items parent as video to which it belongs, check by name (they must match)
                                //check for item with same name in items, if found use it as parent, if not dont add?, emit system mesage
                                //models.virtual_items.create({ name: tmp.name, parent: newlevel})
                                //models.users_data.update({ subrip: 1 }, {where: {id: level}, limit: 1});
                            }
                        }
                    } catch (err) {
                        console.log("error in readDir: " + err);
                    }
                }
                resolve(true);
            });
        });

        cycle.then(function (tmp) {
            if (folderArray.length > 0) {
                Promise.all(folderArray).then(function (data) {
                    resolve(itemList);
                }).catch(function (err) {
                    console.log(err);
                });
            } else {
                resolve(itemList);
            }
        });
    });
}
//FIXME: return correct values
/*
    * Public method to initiate scan, returns integer:
    *   -1 if failed
    *    0 if nothing was changed
    *    x number of items deleted
*/
function scan(uid) {
    return new Promise(function (resolve, reject) {
        init(uid).then(function () {
            fillItemList().then(function (itemList) {
                let promiseArray = Array();
                for(let i in basePath) {
                    promiseArray.push(readDir(basePath[i].path, 0, itemList, basePath[i].id, uid, 0));
                }

                Promise.all(promiseArray).then(function (data) {
                    let ret = 0;
                    for (let i in data) {
                        if (data[i].items.length > 0) {
                            deleteMissingItems(uid, data[i]).then(function (returned) {
                                if (returned) {
                                    ret += data[i].items.length;
                                } else {
                                    reject("Failed to delete " + data[i].items.length + " items.");
                                }
                            });
                        }
                    }
                    resolve(ret);
                });
            }).catch(function (err) {
                console.log("Failed scandir: " + err);
                reject(err);
            });
        });
    });
}

/*
    * Scans for changes, updates database accordingly, returns number of items added/removed
    * uid = user id
*/
function dirscan(uid) {
    return new Promise(function (resolve, reject) {
        scan(uid).then(function (params) {
            resolve(params);
        }).catch(function (params) {
            console.log("dirscan error: " + params);
            reject(false);
        });
    });
}

exports.dirscan = dirscan;
