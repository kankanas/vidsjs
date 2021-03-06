﻿'use strict';

var pathJS = require('path');
var models = require('../models');
var os     = require('os');
var mimeJS  = require('mime');

/*
    * Fetches video directories from users_data table
    * uid = Id of the user
*/
function getPath(uid) {
    return new Promise(function (resolve, reject) {
        models.users_settings.findAll({ where: { type: 'path', uid: uid } }).then(function (path) {
            if (path === null) {
                reject("No paths found in db");
            }
            else {
                let ret = Array();
                for(let i in path) {
                    let tmp = path[i].value.split(';');
                    tmp = tmp.join(pathJS.sep);
                    if(os.type() === 'Linux' || os.type() === 'Darwin') {
                        tmp = '/' + tmp;
                    }
                    ret.push({path: tmp, id: path[i].id});
                }
                resolve(ret);
            }
        }).catch(function (err) {
            reject("get path: " + err);
        });
    });
}

/*
    * Function to sort File listing from Db (used by array.sort)
    * Priority to folders over files
    * After that sorts alphabetically
*/
function compareDirListing(a, b) {
    if (a.type === 1 && b.type === 1) {
        return a.name.localeCompare(b.name);
    } else if (a.type === 1 && b.type === 0) {
        return 1;
    } else if (a.type === 0 && b.type === 1) {
        return -1;
    } else {
        return a.name.localeCompare(b.name);
    }
}

/*
    * Returns link to a video from virtual view
    * id = Id of the item in users_data table
*/
function generateVirtualViewUrl(id) {
    return new Promise(function(resolve, reject) {
        models.virtual_items.find({where: {iid: id}}).then(function (item) {
            if(item === null) {
                resolve("#");
            }
            models.physical_items_mimes.find({where:{iid: id}}).then(function (mime) {
                if(mime === null) {
                    resolve("#");
                }
                else {
                    resolve('/view/' + id + '/' + item.name + '.' + mimeJS.extension(mime.mime));
                }
            });
        });
    });
}


/*
    * Returns link to a video from physical view
    * id = Id of the item in items table
*/
function generatePhysicalViewUrl(id) {
    return new Promise(function(resolve, reject) {
        models.physical_items.find( {where: {id: id}}).then(function (item) {
            if(item === null) {
                resolve("#");
            }
            models.physical_items_mimes.find({where:{iid: id}}).then(function (mime) {
                if(mime === null) {
                    resolve("#");
                }
                resolve('/pview/' + id + '/' + item.name + '.' + mimeJS.extension(mime.mime));
            });
        });
    });
}

/*
    * Returns link to flag item as seen
    * id = Id of the item in database
*/
//FIXME: implement
function generateSeenUrl(id) {
    return '/seen/' + id;
}

/*
    * Returns link to flag item as deleted
    * id = Id of the item in database
*/
//FIXME: implement
function generateDeletedUrl(id) {
    return '/deleted/' + id;
}


/*
    * Returns boolean wether item is flagged as seen by user
    * id = Id of the item in database
*/
//TODO: remove as it is unused
function isSeenOrDeleted(id) {
    return new Promise(function (resolve, reject) {
        if(id > 0) {
            models.virtual_items.find({ where: { id: id } }).then(function (par) {
                if (par === null) {
                    reject(false);
                }
                if (par.seen > 0 || par.deleted > 0) {
                    resolve(true);
                }
                reject(false);
            });
        }
        else {
            reject(false);
        }
    });
}

/*
    * Changes item name in users_data table
    * id   = Id of the item in database
    * name = New name
*/
function changeItemName(id, name) {
    return new Promise(function (resolve, reject) {
        models.virtual_items.find({ where: {id: id}, limit: 1}).then(function (data) {
            if(data === null) {
                reject("id not found");
            }
            models.virtual_items.update({name: name}, {where: {id: id}, limit: 1}).then(function (data) {
                resolve("name changed");
            });
        });
    });
}

/*
    * Creates folder in users_data
    * name   = Name of the folder
    * parent = Parent id
    * uid    = Id of the user
*/
function createFolder(name, parent, uid) {
    return new Promise(function (resolve, reject) {
        models.virtual_items.create({ uid: uid, name: name, iid: 0, seen: 0, deleted: 0, pid: parent, type: 0 }).then(function (data) {
            resolve(true);
        }).catch(function (data) {
            reject(false);
        });

    });
}

/*
    * Move item from one parent to another
    * id     = Id of the item
    * parent = New parent for item
*/
function moveItem(id, parent, uid) {
    return new Promise(function (resolve, reject) {

        models.virtual_items.find({where:{id: parent}}).then(function (data) {
            if((data === null || data.type != 0) && parent != 0) {
                reject(false);
            }
            else {
                models.virtual_items.update( {pid: parent}, {where: {id: id, uid: uid}, limit: 1}).then(function (data) {
                    resolve(true);
                }).catch(function (data) {
                    reject(false);
                });
            }

        });
    });
}

/*
    * Returns wether user needs to authenticate with a password
*/
function getLoginType() {
    return new Promise(function (resolve, reject) {
        models.settings.find({ where: { name: 'loginmethod' } }).then(function (lr) {
            if (lr === null) {
                reject("Setting not found");
            }
            else {
                resolve(parseInt(lr.value));
            }
        }).catch(function (err) {
            reject("Setting login method not found: " + err);
        });
    });
}

/*
    * Hashes password
    * password = Password to hash
*/
//TODO: implement hash function
function hashPassword(password) {
    return password;
}

/*
    * Sets user data in session
    * req   = Expressjs request object
    * id    = Id to set
    * name  = Name to set
    * level = Level to set
*/
function setUser(req, id, name, level) {
    return new Promise(function(resolve, reject) {
        if(typeof req.session.uid  !== "undefined") {
            console.log("User id already set!");
            reject(false);
        }
        else if(typeof req.session.name  !== "undefined") {
            console.log("Name already set!");
            reject(false);
        }
        else if(typeof req.session.level  !== "undefined") {
            console.log("Level already set!");
            reject(false);
        }
        else {
            req.session.uid = id;
            req.session.name = name;
            req.session.level = level;
            resolve(true);
        }
        
    });
    
}

exports.getPath = getPath;
exports.compareDirListing = compareDirListing;
exports.generatePhysicalViewUrl = generatePhysicalViewUrl;
exports.generateVirtualViewUrl = generateVirtualViewUrl;
exports.generateSeenUrl = generateSeenUrl;
exports.generateDeletedUrl = generateDeletedUrl;
exports.isSeenOrDeleted = isSeenOrDeleted;
exports.getLoginType = getLoginType;
exports.changeItemName = changeItemName;
exports.createFolder = createFolder;
exports.moveItem = moveItem;
exports.hashPassword = hashPassword;
exports.setUser = setUser;
