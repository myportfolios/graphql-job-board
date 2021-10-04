import { ApolloClient, InMemoryCache, ApolloLink, HttpLink } from "apollo-boost";
import { gql } from "graphql-tag";
import { forwardRef } from "react";
import { isLoggedIn, getAccessToken } from './auth';

const endpointURL = "http://localhost:9000/graphql";

//apolloLink - used to add header with authorization if user is logged in. 
//ApolloLink enables the use of multiple links which are added to the 'ApolloLink.from' array.
const authLink = new ApolloLink((operation, forward) => {
  /**
   * operation - graphql query or mutation to be executed
   * forward - a fn that enables us to chain multiple steps
   */
  if (isLoggedIn()) {
    operation.setContext({
      headers: {
        "authorization": `Bearer ${getAccessToken()}`
      }
    })
  }
  return forward(operation);
})

//apollo-client setup
const client = new ApolloClient({
  link: ApolloLink.from([
    authLink,//passed in first to allow header to be set b4 call to endpoint
    new HttpLink({ uri: endpointURL })
  ]),
  cache: new InMemoryCache()
})

/********graphqlRequest fn replaced with apollo-client *************/
// const graphqlRequest = async (query, variables = {}) => {
//   const request = {
//     method: "POST",
//     headers: { 'content-type': 'application/json' },
//     body: JSON.stringify({ query, variables })
//   }
//   //if user is logged in, add it's token to header and grant authorization
//   if (isLoggedIn()) {
//     request.headers["authorization"] = `Bearer ${getAccessToken()}`
//   }

//   const response = await fetch(endpointURL, request)
//   //parse response
//   const responseBody = await response.json();
//   //check for errors
//   if (responseBody.errors) {
//     //map tru error array and return each error on a new line
//     const errorMsg = responseBody.errors.map(error => error.message).join('\n')
//     throw new Error(errorMsg)
//   }
//   return responseBody.data
// }

/******* Fragments *********/
const jobDetailFragment = gql`
fragment jobDetails on Job{
      id
        title
        company{
          id
          name
        }
        description
    }

`

/*************** Queries ***************************/
//1. company query
const companyQuery = gql`
query CompanyQuery($id:ID!){
    company(id:$id){
      id
      name
      description
      jobs{
        id
        title
      }
    }
  }
`

//2. job query
const jobQuery = gql`
query JobQuery($id:ID!){ # where JobQuery is the operation name and helps in debugging
      job(id:$id){
        ...jobDetails # job Detail fragment
      }
    }
    ${jobDetailFragment}`;

//3. jobs query
const jobsQuery = gql`
query JobsQuery{  # where JobsQuery is the operation name and helps in debugging
  jobs{
      id
      title
      company{
        id
        name
      }
    }
  }
`
 //4. create job mutation   
 const createJobMutation = gql`
 mutation CreateJobMutation($input: CreateJobInput) { # where CreateJobMutation is the operation name and helps with debugging
   job: createJob(input: $input) {
    ...jobDetails # job Detail fragment reused
   }
 }
 ${jobDetailFragment} # jobDetail fragment definition
`;

/*************** Requests ***************************/
export const loadJobs = async () => {
  const { data: { jobs } } = await client.query({ query: jobsQuery, fetchPolicy:'no-cache' })  //using 'no-cache' option ensures that ApolloClient will not use caching for this request
  //destructure 'data' from the object returned from calln 'client.query'
  //above is how to destructure nested objects. response---->data--->jobs. 'jobs' is destructured from the response 
  return jobs
}
export const loadJob = async (id) => {
  //below, we use the query 'jobQuery' which is the same that is called and assigned the mutation response  in 'createJob'
  const { data: { job } } = await client.query({ query: jobQuery, variables: { id }}) //the arg must be passed in as an obj
  return job
}

export const loadCompany = async (id) => {
  const { data: { company } } = await client.query({ query:companyQuery, variables: { id } })
  return company
} 
/**
 * 
 * @param function update(params) 
 * update fn gives us full control over the cache
  it is called after the mutation has been executed
  'data' is the data present in the graphql response
  we use the 'cache' object to modify what's stored in the cache
  the method 'writeQuery' i s used to save the result of a query
  query (jobQuery) is the query we want to apply the response from the mutation to,
  the jobQuery also accepts an 'id' as arg, this is also gotten from the data - data.job.id
 */
//mutation request
export const createJob = async (input) => {
  const {
    data: { job },
  } = await client.mutate({
    mutation:createJobMutation,
    variables: { input },
    update: (cache, { data }) => {
      cache.writeQuery({
        query: jobQuery,
        variables: { id: data.job.id },
        data,
      });
    },
  });
  return job
}
/**
 * ******* Caching in Apollo Client *************
 * The main feature provided by apollo client is caching - this, however, may cause some undesired effects.
 * We can manipulate the caching feature of ApolloClient by adding 'fetchPolicy' argument with a value of 'no-cache' for any request we don;t want to use caching
 * A second, more sophisticated approach is that if there's a mutation response whose schema is the same as a query, we can cache this response and use for the query 
 * In addition to the 'nutation' and 'variables' argument passed in when calling 'client.mutate' fn, a 3rd argument (update),
 * which is a fn can be used to get the response from a mutation made to graphql.
 * We can then use this response for any query call to graphql that uses the same response in schema. This way, when the query is made, the cached response is
 * provided instead of making a fresh call to graphql
 */


/**
 * *******Apollo-client setup*******
 * Apollo-client offers  enables you to manage both local and remote data with GraphQL. Use it to fetch, cache, and modify application data, all while automatically updating your UI.
 * 1.npm i apollo-boost graphql
 * 1b. This command installs apollo-client with dependencies like apollo-cache,graphql-tag etc. type 'npm view apollo-boost' to view all dependencies
 * 2.import ApolloClient, HttpLink, InMemoryCache from 'apollo-boost
 *
 * Note: the 'client', which is an instance of ApolloClient, has a 'query' method which takes in a structured obj that is parsed by
 * a graphql tag. unlike passing in a string directly.
 * the graphql tag (gql) gn parses string into a graphql object. it returns a promise that resolves into an object with properties such as 'data'
 */
//we use apollo-link to customize the HttpLink