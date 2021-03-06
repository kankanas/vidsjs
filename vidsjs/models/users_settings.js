'use strict';
module.exports = function(sequelize, DataTypes) {
  var users_settings = sequelize.define('users_settings', {
    uid: DataTypes.INTEGER,
    type: DataTypes.STRING,
    value: DataTypes.STRING
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  return users_settings;
};
