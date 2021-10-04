//import fs module and pass as arg into gql fn to create a schema. fs should contain the path to the schema/js file
const fs = require('fs');
const { ApolloServer, gql } = require('apollo-server-express');
// const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const expressJwt = require('express-jwt'); //if user logs in with valid credentials, it appends the token to the user.req body
const jwt = require('jsonwebtoken');
const db = require('./db');

const port = 9000;
const jwtSecret = Buffer.from('Zn8Q5tyZ/G1MHltc4F/gTkVJMlrbKiZt', 'base64');
//bodyParser now added to express.
const bodyParserJson = express.json()

const app = express();
app.use(cors(), bodyParserJson, expressJwt({
  secret: jwtSecret,
  credentialsRequired: false//implies u don't need authenticated credentials to access any route, but if u do send valid credentials, it will extract the 
}));//authentication details from the token

//type definition
//call 'gql' with 'fs module'
const typeDefs = gql(fs.readFileSync("./schema.graphql", { encoding: 'utf8' }))
//resolvers
const resolvers = require('./resolvers')

//setup apollo-server-express
//pass in an object with the schema(typeDefs) and resolvers
//for graphql to have access to the external data like request obj - 'req', we pass in a a 3rd arg - 'context'
//it is a fn that receives an obj and returns our external data. e.g 'req'

// const context = ({ req }) => ({ method: req.method })
//pass authenticated user to graphql 'context'
//get user obj from DB that corresponds with the user id 'sub' generated from token
const context = ({ req }) => ({ user: req.user && db.users.get(req.user.sub) }) //user is set on 'req' by express-jwt if user is authenticated

const apolloServer = new ApolloServer({ typeDefs, resolvers, context })

//call the 'applyMiddleware' method on 'apolloServer' and pass in our express app - 'app' and an optional graphql path
//this is for an existing express application
const graphqlPath = '/graphql';
apolloServer.applyMiddleware({ app, path: graphqlPath }) 


app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.users.list().find((user) => user.email === email);
  if (!(user && user.password === password)) {
    res.sendStatus(401);
    return;
  }
  const token = jwt.sign({ sub: user.id }, jwtSecret);//create token with user's unique 'id'
  res.send({ token });
});

app.listen(port, () => console.info(`Server started on port ${port}`));

/**
 *******Using Apollo Server with an express application**************
 1. install apollo-server-express:
          npm install 'apollo-server-express'
 2. install graphql:
          npm install graphql
 3. import apollo-server-express and destructure 'apolloServer' and 'gql' -
          const {apolloServer, gql} = require('apollo-server-express)
 4. create a var which will store an instance of apollo server taking in 'typeDefs' and 'resolvers' as object arguments -
          const apolloServer = new ApolloServer({typeDefs, resolvers})
 5. Call the applyMiddleware fn on the apolloServer instance and pass in an object argument which contains the express
 application - 'app', and an optional 'path' to expose the GraphQl endpoint on our server - '/graphql' it defaults to '/graphql' but it's ok to explicitly state it for clarity
          apolloServer.applyMiddleware({app, path:"graphql"})
 */

/**Accessing request body (req) in resolvers
 * say we need to authenticate a user b4 we carry out a mutation, the following needs to be consideered
 * 1. In the resolvers, a third parameter can be passed into the resolver fn in addition to the 'root' and 'arg' parameters
 * 2. This is usually called 'context'.
 * 3. it is used to recieve all data that are not graphql related but are provided by our application
 * 4. it stores whatever we pass/save into it.
 * 5. In the server, consequently, we also need to pass in a 3rd parameter (context) to the ApolloServer instance in addition to typeDefs and resolvers.
 * 6. This context parameter will be a fn that recieves an object that contains the express request object (req).
 * 7. this fn returns an object which is the 'context' obj that we get in the resolvers
 * const apolloServer = new ApolloServer({typeDefs, resolver, context:({req}) => {
       method:req.method
 * }})
 */

    //_variableName. This implies it's a private var and shouldn't b used directly