module.exports = class functions {
  constructor(octokit, core) {
    this.octokit = octokit;
    this.core = core;
  }

  async commentOnIssue(issueID, comment) {
    const addCommentMutation = `mutation addComment($issueId: ID!, $commentBody: String!){ 
      addComment(input:{subjectId: $issueId , body: $commentBody}) {
        commentEdge {
          node {
            id
          }
        }
        }
      }`;

    const variables = {
      issueId: issueID,
      commentBody: comment,
    }
    const result = await this.octokit.graphql(addCommentMutation, variables)
    if (!result) {
      this.core.setFailed('GraphQL request failed')
    } 

    return result
  }


  async getIssueInfo(issueID) {
    const getIssueInfoQuery = `query($issueId: ID!) { 
      node(id:$issueId) {
        ... on Issue {
          title,
          number
        }
      }
    }`;

    const variables = {
      issueId: issueID
    }
    const result = await this.octokit.graphql(getIssueInfoQuery, variables)
    if (!result) {
      this.core.setFailed('GraphQL request failed')
    } 
    else {
      console.log(`Title: ${result.node.title}`)
    } 
    return result.node
  }

  async addLabelToIssue(issueID, labelID) {
    const addLabelMutation = `mutation addLabel($issueId: ID!, $labelId: [ID!]!){ 
      addLabelsToLabelable(input:{labelIds:$labelId, labelableId:$issueId}){
        labelable {
          ... on Issue {
            id
          }
        }
      }
    }`;

    const variables = {
      issueId: issueID,
      labelId: labelID
    }
    const result = await this.octokit.graphql(addLabelMutation, variables)
    if (!result) {
      this.core.setFailed('GraphQL request failed')
    } 
    else {
      console.log(`Added Label: nodeId: ${result.addLabelsToLabelable.labelable.id}`)
    } 
    return result.addLabelsToLabelable.labelable
  }
}