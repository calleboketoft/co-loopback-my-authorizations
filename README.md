Enable in file 'common/models/User.js' like this:

```javascript
require('../../co-loopback-my-authorizations')(User)
```

Now the endpoint `myAuthorizations` is added to the user model. See the API explorer for more info about what the endpoint delivers.