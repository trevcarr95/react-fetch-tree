const babelParser = require("@babel/parser");
const fs = require("fs");
const traverse = require("@babel/traverse").default;
const path = require("path");

let ID = 0;
const cache = {};
const reactComponents = {};

//Obtain  target file's dependencies 
const getDependencies = (filename) => {
  //Declare dataRequestObject
  const dataRequests = [];
  //Stores the name/value of all ImportDeclaration nodes
  const dependencies = [];
  //Stores functions/variavbles in file
  const nodeStore = {};
  //Function/DataRequest name placeholder
  let parentName = null;
  let reqName = null;
  //Data node class template
  class DataRequestNode {
    constructor(dataRequestType, position, parentName) {
      this.dataRequestType = dataRequestType
      this.position =  position || null
      this.parentName = parentName || 'Anonymous'
    }
  }

  //Read file content
  const content = fs.readFileSync(filename, "utf8");
  //Parse file to convert it into an AST
  const raw_ast = babelParser.parse(content, {
    sourceType: "module",
    plugins: ["jsx"],
  });

  //Helper function to check node existence
  const nodeExistence = (nodePosition, reqName, parentName, exists = false) => {
    dataRequests.forEach(existingDataRequest => {
      if (existingDataRequest.position === nodePosition) {
        exists = true;
      }
    })
    if (!exists) {
      const dataRequest = new DataRequestNode(reqName, nodePosition, parentName);
      dataRequests.push(dataRequest);
    }
    return;
  }

  //Node types and conditionals
  const IdentifierPath = {
    CallExpression: ({node}) => {
      reqName = node.callee.name
      if (node.callee.name === 'fetch') { nodeExistence(node.loc.start, reqName, parentName) };
      if (nodeStore[parentName]) { nodeStore[parentName].push(reqName) };
    },
    MemberExpression: ({ node }) => {
      reqName = node.object.name;
      if (
        node.object.name === 'axios' || 
        node.object.name === 'http' ||
        node.object.name === 'https' ||
        node.object.name === 'qwest' ||
        node.object.name === 'superagent'
      ) { 
        nodeExistence(node.loc.start, reqName, parentName) 
      };
      if (node.property.name === 'ajax') {
        reqName = node.property.name;
        nodeExistence(node.loc.start, reqName, parentName)
      };
    },
    NewExpression: ({ node }) => {
      reqName = node.callee.name
      if (node.callee.name === 'XMLHttpRequest') { nodeExistence(node.loc.start, reqName, parentName) };
    },
    ReturnStatement: ({ node }) => {
      if (node.argument) {
        if (
          node.argument.type === 'JSXElement' && 
          parentName && 
          !reactComponents.hasOwnProperty(parentName)
        ) {
          reactComponents[parentName] = [];
          // console.log(parentName, node.argument.type);
          // console.log(node.argument.loc);
        }
      }
    }
  }

  // const JSXPath = {
  //   CallExpression: ({ node }) => {
  //     console.log(node.callee.name)
  //   },
  // }

  //Traverse AST using babeltraverse to identify imported nodes
  traverse(raw_ast, {
    ImportDeclaration: ({ node }) => {
      if (node.source.value.indexOf('./') !== -1) dependencies.push(node.source.value);
    },
    Function(path) {
      if(path.node.id) {
        parentName = path.node.id.name;
        if (!nodeStore[parentName]) { nodeStore[parentName] = [] }; 
      } 
      path.traverse(IdentifierPath);
      parentName = null;
    },
    VariableDeclarator(path) {
      if(path.parent.declarations[0].id.name) {
        parentName = path.parent.declarations[0].id.name
        if (!nodeStore[parentName]) { nodeStore[parentName] = [] }
      } 
      path.traverse(IdentifierPath);
      parentName = null;
    },
    ExpressionStatement(path) {
      path.traverse(IdentifierPath);
    },
    ClassDeclaration(path) {
      if(path.node.id) {
        parentName = path.node.id.name
        if (!nodeStore[parentName]) { nodeStore[parentName] = [] }
      } 
      path.traverse(IdentifierPath);
      parentName = null;
    },
    // JSXExpressionContainer(path) {
    //   if (path.node.expression.type === "ArrowFunctionExpression") {
    //     path.traverse(JSXPath);
    //   }
    // }
  })

  const id = ID++;
  cache[filename] = id;

  return {
    id,
    filename,
    dependencies,
    dataRequests,
    nodeStore
  };
};

const dependenciesGraph = (entryFile) => {
  const entry = getDependencies(entryFile);
  const queue = [entry];

  for (const asset of queue) {
    asset.mapping = {};
    const dirname = path.dirname(asset.filename);

    asset.dependencies.forEach(relativePath => {
      //If there is no file extension, add it
      let absolutePath = path.resolve(dirname, relativePath);
      let fileCheck = fs.existsSync(absolutePath)
      let child;

      if (!fileCheck) {
        absolutePath = path.resolve(dirname, relativePath + '.js'); //Test for .js
        fileCheck = fs.existsSync(absolutePath);
        if (!fileCheck) absolutePath = absolutePath + 'x'; //Test for .jsx
      }

      //Check for duplicate file paths
      if (!cache[absolutePath]) {
        child = getDependencies(absolutePath);
        queue.push(child);
      }
      asset.mapping[relativePath] = cache[absolutePath];
    })
  }
  // console.log(queue[0].dataRequests)
  console.log(queue[1].dataRequests)
  console.log(queue[0].nodeStore)
  // console.log(queue[2].dataRequests)
  // console.log(reactComponents);
  return queue;
}


console.log(dependenciesGraph('./src/index.js'));
console.log(cache);

// For each node store, check if it exists in reactComponents, if not, delete!
// If it exists, check if it exists in list of dataRequest names, if not, delete!

// Should we just do an array for components and another for all datarequest nodes?
// We can then access each component's variables and filter out the noise & retrieve request type!
// No need to store and send back file relationships if it's already being sorted out by the fiber tree...