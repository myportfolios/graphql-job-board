//resolvers is an object that matches the type definition with keys whose value is a fn that returns some data
//Resolver - a fn or method that resolves a value for a type or field in a schema

const db = require("./db");

/****************Queries***********************/
const Query = {
    company: (root, arg) => db.companies.get(arg.id),
    jobs: () => db.jobs.list(),
    job: (root, { id }) => db.jobs.get(id),

}
/****************Mutations***********************/
const Mutation = {
    //check user authentication b4 mutation
    //the 'context' arg can be used to access data that are not part of graphql
    //the context will  contain anything we pass into it
    //pass it as the 3rd arg into the resolver fn
    createJob: (root, { input }, context) => {
        //validate
        if (!context.user) {//express-jwt only appends the 'user' obj when a request is authenticated
            throw new Error("Unauthorized")
        }
        const id = db.jobs.create({ ...input, companyId: context.user.companyId })
        const newJob = db.jobs.get(id)
        return newJob
    }
}


/****************Types***********************/
const Job = {
    //each resolver fn receives some args - parentArg and otherArgsPassedIn
    //In this case 'job' is a parent of 'company' (parentArg), so we use the parentArg to get the 'companyId' from 
    company: (job) => db.companies.get(job.companyId)
}
const Company = {
    jobs: (company, arg) => db.jobs.list().filter((item) => item.companyId === company.id)
}

module.exports = { Query, Mutation, Job, Company }











/********************Resolver and schema comments*****************
 *The 'resolvers' must reflect the schema
 * in the schema, the 'company' is a field on the job object, we have to create same ( a job object with a 'company' that returns a fn) in the resolver
//The 'Job' object has a field 'companyId' from the server,
//but in the schema we are passing in the whole 'Company' obj which contains the company id - 'id'
//to resolve, we have to look into the 'Job' object to get a company with an 'id'
 */