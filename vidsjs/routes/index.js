﻿'use strict';

var express = require('express');
var jade = require('jade');
var Sequelize = require('sequelize');
var mods = require('../modules');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res) {
    mods.dirlist.getDirListing(0, null).then(function (cont) {
        cont.items.sort(mods.utils.compareDirListing);
        res.render('dirlist', { content: cont });
    }).catch(function (err) {
        console.log("route / " + err);
    });
});

router.get('/api/dirlist', function (req, res) {
    getDirListing(0, null).then(function (cont) {
        cont.items.sort(mods.utils.compareDirListing);
        res.render('dirlist', { content: cont });
    }).catch(function (err) {
        console.log("route /api/dirlist " + err);
    });
});

router.get('/view/:id', function (req, res) {
    mods.view.view(res, req.params.id);
});

router.get('/scanDirs', function (req, res) {
    //TODO: TEST THIS
    mods.dirscan.scan().then(function (number) {
        let num = parseInt(number);
        if (num === 0) {
            res.render('index', { content: 'list is up to date !' });
        } else if (num === -1) {
            res.render('index', { content: 'failed to delete ' + number + ' items' });
        } else {
            res.render('index', { content: number + 'items has been deletered' });
        }
    });
});

module.exports = router;