'use strict'

var debug = require('debug')('model:user')
module.exports = function (app, User) {
  // Fetch authorizations for current user's id and roles
  // see which authorizations any user has
  User.myAuthorizations = (options, cb) => {
    let RoleMapping = app.models.RoleMapping
    let Role = app.models.Role
    let ACL = app.models.ACL

    let userId = options.accessToken.__data.userId

    let authorizations = {
      roles: [],
      acls: []
    }

    debug('find({ where: { principalType: %s, principalId: %s }})', 'USER', userId)
    RoleMapping.find({ where: { principalType: 'USER', principalId: userId } }, (err, roleMappings) => {
      debug('found %s', roleMappings)
      let rolesToFetch = roleMappings.map((roleMapping) => {
        return {
          id: roleMapping.roleId
        }
      })

      Role.find({ where: { or: rolesToFetch } }, (err, roles) => {
        let aclsToFetch = roles.map((role) => {
          authorizations.roles.push(role.name)
          return {
            principalType: 'ROLE',
            principalId: role.name,
            permission: 'ALLOW'
          }
        })

        authorizations.roles.push('$everyone');
        aclsToFetch.push({
          principalType: 'ROLE',
          principalId: '$everyone',
          permission: 'ALLOW'
        })

        authorizations.roles.push('$authenticated')
        aclsToFetch.push({
          principalType: 'ROLE',
          principalId: '$authenticated',
          permission: 'ALLOW'
        })

        authorizations.roles.push('$owner')
        aclsToFetch.push({
          principalType: 'ROLE',
          principalId: '$owner',
          permission: 'ALLOW'
        })

        ACL.find({ where: { or: aclsToFetch } }, (err, acls) => {
          authorizations.acls = acls.map((acl) => {
            return {
              model: acl.model,
              property: acl.property,
              accessType: acl.accessType
            }
          })
          cb(null, authorizations)
        })
      })
    })
  }

  User.remoteMethod('myAuthorizations', {
    accepts: {
      arg: 'options',
      type: 'object',
      http: 'optionsFromRequest'
    },
    returns: {
      arg: 'authorizations',
      type: 'object'
    },
    http: {
      verb: 'get'
    },
    description: 'Find all ACLs with permission "ALLOW" and roles for the currently authenticated user.'
  })
}

