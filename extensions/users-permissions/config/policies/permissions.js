const _ = require('lodash');
const {utils} = require("ethers")

/**
 * Given a ctx, retrieve the bearer token
 * @param {any} ctx
 */
 const retrieveJWTToken = (ctx) => {
  const params = _.assign({}, ctx.request.body, ctx.request.query)

  let token = ''

  if (ctx.request && ctx.request.header && ctx.request.header.authorization) {
      const parts = ctx.request.header.authorization.split(' ')

      if (parts.length === 2) {
          const scheme = parts[0];
          const credentials = parts[1];
          if (/^Bearer$/i.test(scheme)) {
              token = credentials
          }
      } else {
          throw new Error(
              'Invalid authorization header format. Format is Authorization: Bearer [token]'
          )
      }
  } else if (params.token) {
      token = params.token
  } else {
      throw new Error('No authorization header was found')
  }

  return (token)
};


/**
 * Given a signature and the message, returns the public address
 * @param token
 * @param message
 * @returns
 */
 const verifyToken = (message, token) => {
  const address = utils.verifyMessage(message, token);
  return address.toLowerCase();
};


module.exports = async (ctx, next) => {
  let role;

  if (ctx.state.user) {
    // request is already authenticated in a different way
    return next();
  }

  if (ctx.request && ctx.request.header && ctx.request.header.authorization) {
    try {
      const { id } = await strapi.plugins['users-permissions'].services.jwt.getToken(ctx);

      if (id === undefined) {
        throw new Error('Invalid token: Token did not contain required fields');
      }

      // fetch authenticated user
      ctx.state.user = await strapi.plugins[
        'users-permissions'
      ].services.user.fetchAuthenticatedUser(id);
      
    } catch (err) {
      /** With Metamask Changes */
        try{
          const token = retrieveJWTToken(ctx)
          console.log("token", token)
          const address = verifyToken("profile", token)
          console.log("address", address)

          ctx.state.user = await strapi.plugins['users-permissions'].services.user.fetch({
            email: address
          })

          if(!ctx.state.user){
            //Create the user
            try{
                const advanced = await strapi
                    .store({
                        environment: '',
                        type: 'plugin',
                        name: 'users-permissions',
                        key: 'advanced',
                    })
                    .get()
                const defaultRole = await strapi
                    .query('role', 'users-permissions')
                    .findOne({ type: advanced.default_role }, [])

                ctx.state.user = await strapi.plugins['users-permissions'].services.user.add({
                    username: address,
                    email: email,
                    role: defaultRole,
                    confirmed: true,
                    provider: 'Metamask'
                })
            } catch(err){
                console.log('Exception in user creation in permissions', err)
            }
          }
      } catch (err) {
        console.log("err", err)
          return handleErrors(ctx, err, 'unauthorized');
      }
      /** END With Metamask Changes */
    }

    if (!ctx.state.user) {
      return handleErrors(ctx, 'User Not Found', 'unauthorized');
    }

    role = ctx.state.user.role;

    if (role.type === 'root') {
      return await next();
    }

    const store = await strapi.store({
      environment: '',
      type: 'plugin',
      name: 'users-permissions',
    });

    if (
      _.get(await store.get({ key: 'advanced' }), 'email_confirmation') &&
      !ctx.state.user.confirmed
    ) {
      return handleErrors(ctx, 'Your account email is not confirmed.', 'unauthorized');
    }

    if (ctx.state.user.blocked) {
      return handleErrors(
        ctx,
        'Your account has been blocked by the administrator.',
        'unauthorized'
      );
    }
  }

  // Retrieve `public` role.
  if (!role) {
    role = await strapi.query('role', 'users-permissions').findOne({ type: 'public' }, []);
  }

  const route = ctx.request.route;
  const permission = await strapi.query('permission', 'users-permissions').findOne(
    {
      role: role.id,
      type: route.plugin || 'application',
      controller: route.controller,
      action: route.action,
      enabled: true,
    },
    []
  );

  if (!permission) {
    return handleErrors(ctx, undefined, 'forbidden');
  }

  // Execute the policies.
  if (permission.policy) {
    return await strapi.plugins['users-permissions'].config.policies[permission.policy](ctx, next);
  }

  // Execute the action.
  await next();
};

const handleErrors = (ctx, err = undefined, type) => {
  throw strapi.errors[type](err);
};