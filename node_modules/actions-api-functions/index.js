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
      this.core.setFailed('commentOnIssue GraphQL request failed')
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
      this.core.setFailed('getIssueInfo GraphQL request failed')
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
      this.core.setFailed('addLabelToIssue GraphQL request failed')
    } 
    else {
      console.log(`Added Label: nodeId: ${result.addLabelsToLabelable.labelable.id}`)
    } 
    return result.addLabelsToLabelable.labelable
  }

  async getIssueLastTimelineEvent(projectColumn) {

    const getLastTimelineEvent = `query($projectColumnID: ID!) { 
      node(id: $projectColumnID) { 
        ... on ProjectColumn { 
          name
          cards  {
            nodes {
              content {
                ... on Issue {
                  url
                  id
                  timelineItems(last: 1, itemTypes: MOVED_COLUMNS_IN_PROJECT_EVENT) {
                    nodes {
                      __typename
                      ... on MovedColumnsInProjectEvent {
                        previousProjectColumnName
                        createdAt
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }`;

    const variables = {
      projectColumnID: projectColumn,
      headers: {
        Accept: `application/vnd.github.starfox-preview+json`
      }
    }
    const result = await this.octokit.graphql(getLastTimelineEvent, variables)
    if (!result) {
      this.core.setFailed('getIssueLastTimelineEvent GraphQL request failed')
    } 
    else {
      console.log(`Got Issue Last Timeline Event`)
    } 
    return result
  }




}