const core = require('@actions/core');
const github = require('@actions/github');
const myToken = core.getInput('github-token');
const octokit = github.getOctokit(myToken)
const functionsLib = require('actions-api-functions');
var functions = new functionsLib(octokit, core)
const InProgressColumnID = core.getInput('InProgressColumnID');
const ReviewSuccessColumnID = core.getInput('ReviewSuccessColumnID');

const reviewSuccessReminderDuration1 = 14
const reviewSuccessReminderDuration2 = 30
const day21Duration = 21
const day45Duration = 45
const day90Duration = 90

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
  reviewSuccessReminders.push({duration: reviewSuccessReminderDuration1, comment: `:wave: This POC has been in **Completed: Review Success Criteria** for ${reviewSuccessReminderDuration1} days.\n\nIs there anything you need help with?`})
  reviewSuccessReminders.push({duration: reviewSuccessReminderDuration2, comment: `:wave: This POC has been in **Completed: Review Success Criteria** for ${reviewSuccessReminderDuration2} days.\n\nIs there anything you need help with?`})
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
    await addLabelBasedOnDuration(poc, day21Duration)
    await addLabelBasedOnDuration(poc, day45Duration)
    await addLabelBasedOnDuration(poc, day90Duration)
  }
}

async function addLabelBasedOnDuration(poc, duration) {
  if (poc.duration == duration) {
    const labelID = getLabelID(duration)
    console.log(`Adding label: ${labelID} to POC: ${poc.url} : ${poc.id} for duration: ${duration}`)
    await functions.addLabelToIssue(poc.id, labelID)
  }

}

function getLabelID(duration) {
  var labelIDs = {}
  labelIDs[day21Duration] = core.getInput('day21LabelID');
  labelIDs[day45Duration] = core.getInput('day45LabelID');
  labelIDs[day90Duration] = core.getInput('day90LabelID');
  return labelIDs[duration]
}