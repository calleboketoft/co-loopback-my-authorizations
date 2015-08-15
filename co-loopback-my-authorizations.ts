// Use in the file 'common/models/User.js' like this:
// require('../../co-loopback-my-authorizations')(User)

var debug = require('debug')('model:user')
module.exports = function (app, User) {
  // Fetch authorizations for current user's id and roles
  // TODO this could be modified to take a user id as param to
  // see which authorizations any user has
  User.myAuthorizations = (cb) => {
    var loopback = require('loopback')
    var RoleMapping = app.models.RoleMapping
    var Role = app.models.Role
    var ACL = app.models.ACL

    // https://github.com/strongloop/loopback/issues/569#issuecomment-62690674
    // anywhere in the app
    var ctx = loopback.getCurrentContext()
    var currentUser = ctx && ctx.get('currentUser')

    // When using MongoDB, the id is an object, but in the RoleMappings it is a string
    var userId = currentUser.__data.id
    if (typeof userId === 'object') {
      userId = userId.toString()
    }

    var authorizations = {
      roles: [],
      acls: []
    }

    debug('find({ where: { principalType: %s, principalId: %s }})', 'USER', userId)
    RoleMapping.find({ where: { principalType: 'USER', principalId: userId } }, (err, roleMappings) => {
      debug('found %s', roleMappings)
      var rolesToFetch = roleMappings.map((roleMapping) => {
        return {
          id: roleMapping.roleId
        }
      })

      Role.find({ where: { or: rolesToFetch } }, (err, roles) => {
        var aclsToFetch = roles.map((role) => {
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
    returns: { arg: 'authorizations', type: 'object' },
    http: { verb: 'get' },
    description: 'Find all ACLs with permission "ALLOW" and roles for the currently authenticated user.'
  })
}
