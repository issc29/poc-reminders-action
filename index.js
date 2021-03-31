const core = require('@actions/core');
const github = require('@actions/github');
const myToken = core.getInput('github-token');
const octokit = github.getOctokit(myToken)
const functionsLib = require('actions-api-functions');
var functions = new functionsLib(octokit, core)
const InProgressColumnID = core.getInput('InProgressColumnID');
const ReviewSuccessColumnID = core.getInput('ReviewSuccessColumnID');

run();

async function run() {

  try {
    const inProgressReminders = getInProgressReminders()
    await runPOCReminders(InProgressColumnID, inProgressReminders)
    const reviewSuccessReminders = getReviewSuccessReminders()
    await runPOCReminders(ReviewSuccessColumnID,reviewSuccessReminders)
  } catch (error) {
    core.setFailed(error.message);
  }
}

function getInProgressReminders(){
  var inProgressReminders = []
  const midpointDuration = core.getInput('midpointDuration');
  const endDuration  = core.getInput('endDuration');
  inProgressReminders.push({duration: midpointDuration, comment: `:wave: Midpoint Check-in:\n* How is the POC progressing?\n* How many repos has the customer onboarded?\n* Is there anything you need help with?`})
  inProgressReminders.push({duration: endDuration, comment: `:wave: @issc29 POC duration has reached 21 days`})
  return inProgressReminders
}

function getReviewSuccessReminders(){
  var reviewSuccessReminders = []
  reviewSuccessReminders.push({duration: 0, comment: `:wave: This POC has been in **Completed: Review Success Criteria** for 14 days.\n\nIs there anything you need help with?`})
  reviewSuccessReminders.push({duration: 30, comment: `:wave: This POC has been in **Completed: Review Success Criteria** for 30 days.\n\nIs there anything you need help with?`})
  return reviewSuccessReminders
}

async function runPOCReminders(columnID, reminders){
  const projectColumnData = await functions.getIssueLastTimelineEvent(columnID)
  var pocs = getPOCDurations(projectColumnData.node.cards.nodes)

  await addComments(pocs, reminders)
  await labelAllPOCSBasedOnDuration(pocs)
}

function getPOCDurations(projectCards){
  var pocs = [];
  console.log(`POC Days per Issue:`)
  for (const projectCard of projectCards) {
    const timelineItems = projectCard.content.timelineItems.nodes
    if(timelineItems.length > 0) {
      pocs.push(getIssueInfo(projectCard))
    }
  }
  return pocs
}

function getIssueInfo(projectCard) {
  const timelineItems = projectCard.content.timelineItems.nodes
  var POCdurationDays = getIssueDuration(timelineItems[0].createdAt)
  console.log(`${projectCard.content.url} : ${POCdurationDays} days`)
  const issueInfo = {id: projectCard.content.id, url: projectCard.content.url, duration: POCdurationDays}
  return issueInfo
}

function getIssueDuration(createdAtDate) {
  const createdDate = new Date(createdAtDate).getTime()
  var POCduration = Date.now() - createdDate;
  var POCdurationDays = getDurationInDays(POCduration)
  return POCdurationDays
}


function getDurationInDays(durationInMilliseconds) {
  return Math.floor(durationInMilliseconds / (1000 * 3600 * 24)); 
}

async function addComments(pocs, reminders){
  for (const poc of pocs) {
    for (reminder of reminders) {
      await commentOnDuration(poc, reminder)
    }
  }
}

async function commentOnDuration(poc, reminder){
  if (poc.duration == reminder.duration) {
    await functions.commentOnIssue(poc.id, reminder.comment)
  } 
}

async function labelAllPOCSBasedOnDuration(pocs){
  for (const poc of pocs) {
    await addLabelBasedOnDuration(poc, 21)
    await addLabelBasedOnDuration(poc, 45)
    await addLabelBasedOnDuration(poc, 90)
  }
}

async function addLabelBasedOnDuration(poc, duration) {
  if (poc.duration == duration) {
    const labelID = getLabelID(duration)
    await functions.addLabelToIssue(poc.id, labelID)
  }

}

function getLabelID(duration) {
  var labelIDs = {}
  labelIDs[21] = core.getInput('day21LabelID');
  labelIDs[45] = core.getInput('day45LabelID');
  labelIDs[90] = core.getInput('day90LabelID');
  return labelIDs[duration]
}