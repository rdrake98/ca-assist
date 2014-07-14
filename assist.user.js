/**
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* any later version.

* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
* GNU General Public License for more details.

* You should have received a copy of the GNU General Public License
* along with this program. If not, see <http://www.gnu.org/licenses/>.
*/

// DEBUG HINTS
// For most reliable re-run, ininstall, reinstall

/**
* @package Climate Audit Assistant
* @Copyright ClimateAudit.org 2009+. All right reserved
* @authors: MrPete and friends
* @created: January 8, 2010
* @version 0.1
* @credits: Inspired by Mafia Wars Autoplayer script and more
*
* History:
* 0.1 Use jQuery 2.0.3 and support Climate Etc.
* 0.0.9 Support new Lucia version.
* 0.0.8 All Open Science Blog Ring sites now should work. Comment reorder now optional. Many bugfixes.
*/

//
// Sites listed below are members of the new Open Source Webring
//

// ==UserScript==
// @name        Assist+
// @namespace   ca-assist
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_getResourceText
// @grant       GM_xmlhttpRequest
// @description Enhances user experience on climate blogs courtesy of Climate Audit and MrPete
// @copyright   2009+, MrPete, Richard Drake and friends. All right reserved
// @license     GPL version 3 or any later version; http://www.gnu.org/copyleft/gpl.html
// @include     http://climateaudit.org/*
// @include     http://judithcurry.com/*
// @include     http://dev.whiteword.com/assist/*
// @version     0.1
// @require     jquery.min.js
// @require     images.js
// @resource    styles styles.css
// ==/UserScript==

var SCRIPT = { // URL of script for updates
  url: 'https://github.com/rdrake98/ca-assist/raw/master/assist.user.js',
  version: '0.1',
  build: '43',
}

var $j = jQuery.noConflict()

$j('head').append("<style>\n" + GM_getResourceText('styles') + "\n</style>") 

console.log('hostname: '+location.hostname)

if (window.top != window.self) return //don't run on frames or iframes

String.prototype.trim = function() {
  return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '')
}
String.prototype.ltrim = function() {
  return this.replace(/^\s\s*/, '')
}
String.prototype.rtrim = function() {
  return this.replace(/\s\s*$/, '')
}
String.prototype.untag = function() {
  return this.replace(/<[^>]+>/g, '')
}

function empty(data) {
  if (typeof(data) == 'number' || typeof(data) == 'boolean') return false
  if (typeof(data) == 'undefined' || data === null) return true
  if (typeof(data.length) != 'undefined') return data.length == 0
  for (var i in data) if (data.hasOwnProperty(i)) return false
  return true
}

/* **************************************************
           Sort the comment tree
   ************************************************** */

var siteType='CA'
switch(location.hostname) {
  case 'climateaudit.org': siteType='CA'; break;
  case 'judithcurry.com': siteType='CE'; break;
  case 'dev.whiteword.com':
    siteType=location.pathname.split('/')[2].split('.')[0].slice(0,-1);
    break;
}
console.log('Site type: '+siteType)

//listID   where to find the comment list
//bSeqDate True if date element precedes each comment element (WUWT)
//dtRegEx string for finding date/time--convert to regex
//dtRegRep string for date/time result
//itemElm  how to find each comment in the list
//dateText how to find date text, given we're pointing to the comment (or preceding item)
//replyElm on which element to attach the Paste Reply link
//bHasReply true if there's a reply link on each comment (otw, Paste Link will say "Re:")

var cmtForm
switch (siteType) {
  case 'CA': cmtForm= { 'listID': '#comments-list ol','listElm':'#commentListOL li','hideElm':'',
    'threadElm':'#commentListOL > li','bSeqDate':0, 'topDiv':'#header','replyElm':'.comment-meta:first',
    'authElm':'.comment-author:first','itemElm': 'li.comment', 'dateText': '.comment-meta:first', 'bHasReply':true }; break;
  case 'CE': cmtForm= { 'listID': '.commentlist','listElm':'#commentListOL li','hideElm':'',
    'threadElm':'#commentListOL > li','bSeqDate':0, 'topDiv':'#header','replyElm':'.comment-meta:first',
    'authElm':'.comment-author:first','itemElm': 'li.comment', 'dateText': 'span.commentmetadata a:first-child', 'bHasReply':true }; break;
};

function getCmtDate(elm) {
  var txt = $j(cmtForm.dateText,elm).text()
  txt = siteType == 'CE' ? txt.split("\n")[1].trim() : txt
  // optional 'Posted ', then mm ddth, yyyy at hh:mm pm
  txt = txt.split('|',1)[0]; // remove any option stuff at the end...
  var sRep='$1$3 $4';
  return txt.replace(/(?:Posted )?([A-Za-z]+ [0-9]+)([a-z]*)(, [0-9]+) at ([0-9]+:[0-9]+ (AM|PM))+/i, sRep).trim();
}

//
// INIT
//

var settingsOpen = false;

var isNew = GM_getValue('isNew',8);
var isOld = GM_getValue('isOld',24);
var bReorgRcntCmt = GM_getValue('bReorgRcntCmt','checked');
var bColorAge = GM_getValue('bColorAge','checked');
var bHideOld = GM_getValue('bHideOld','checked');
var bShowThreads = GM_getValue('bShowThreads','checked');
var bRecentLast = GM_getValue('bRecentLast','checked');
var bEnableOrder = GM_getValue('bEnableOrder','checked');

DEBUG('Completed initialize.');

customizeMasthead();


/////////////////////////////////////////////////////////////////
//
// Reorganize Recent Comments Sidebar
//
/////////////////////////////////////////////////////////////////

/* function sortrc(a,b) {
     return a.id > b.id ? 1 : -1;
} */

if (bReorgRcntCmt) {
  var elmRC = $j('ul#recentcomments');
  var rcList= new Array();
  if (elmRC.length) {
    $j('.recentcomments').each(function (i) {
        var elmLinks=$j('a',this);
        switch (elmLinks.length) {
          default:
          case 1: // normal
            var elm= $j(this).get(0);
            var sAuth = elm.childNodes[0].textContent;
            sAuth = sAuth.substring(0, sAuth.length-4);
            var sURL  = $j(elmLinks).attr('href');
            var sTopic = $j(elmLinks).text();
            break;
          case 2: // Auth has a link
            var elmA =  $j('a:first',this);
            var sAuth = elmA.text();
            elmA = elmA.next();
            var sURL = elmA.attr('href');
            var sTopic = elmA.text();
            break;
        }
        if (rcList[sTopic] == undefined) { rcList[sTopic]=''; }
        rcList[sTopic]+= '<li class="recentcomments"><a href="'+sURL+'" title="View the  comment by '+sAuth+
          '"><span class="commentAuthor">'+sAuth+'</span></a></li>\n';
    });
    var sOut='';
    for (rcKey in rcList)  {
      sOut +='<h4 class="recentCommentsPostTitle">'+rcKey+'</h4>\n';
      // Create a nested list of the recent comments within the current post
      sOut +='<ul>\n'+rcList[rcKey]+'\n</ul>\n';
    }
    $j(elmRC).html(sOut);
  }
}


/////////////////////////////////////////////////////////////////
// functions on comment pages
/////////////////////////////////////////////////////////////////


console.log(cmtForm.listID)
console.log($j(cmtForm.listID).length)
DEBUG('Initial site-dependent comment page prep');
if (!$j(cmtForm.listID).length) { // don't waste time on non-comment pages
  DEBUG('Not a comment page');
  return;
}

$j(cmtForm.listID).attr('id','commentListOL');

DEBUG('Define main comment page functions');

var cmtDates = new Array();
var cmtCurDate = new Date;
var cmtOldAge, cmtNewAge;

function setAgeValues() {
  cmtOldAge = cmtCurDate.valueOf() - isOld*60*60*1000;
  cmtNewAge = cmtCurDate.valueOf() - isNew*60*60*1000;
}

const AGE_OLD  = 0;
const AGE_NORM = 1;
const AGE_NEW  = 2;

function getCommentAge(elm) {
//  console.log('test:'+(cmtDates[elm.id]));
//  console.log('diffn:'+(cmtDates[elm.id] - cmtOldAge));
//  console.log('diffb:'+(cmtDates[elm.id] >= cmtOldAge));
  var cmtAge = cmtDates[elm.id];
  if (cmtAge <= cmtOldAge) return AGE_OLD;
  if (cmtAge >= cmtNewAge) return AGE_NEW;
  return AGE_NORM;
}

function getCmtNum(cmt) {
  var id=cmt.id;
  return 0+id.split('-').slice(-1);
}

//
// Sort comments, ascending/descending and threaded/unthreaded
//

function sortIDasc(a,b) {
     return a.id > b.id ? 1 : -1;
}
function sortIDdesc(a,b) {
     return a.id < b.id ? 1 : -1;
}
function getMaxTreeID(a) {
  // Return max id from a and its child comment objects
  var maxC=getCmtNum(a);
  $j(cmtForm.itemElm,a).each(function (i) {
        var cNum = getCmtNum(this);
        if (cNum > maxC) { maxC = cNum; }
      });
  return maxC;
}
function sortTreeIDasc(a,b) {
     return getMaxTreeID(a) > getMaxTreeID(b) ? 1 : -1;
}
function sortTreeIDdesc(a,b) {
     return getMaxTreeID(a) < getMaxTreeID(b) ? 1 : -1;
}

var sReplyTxt= cmtForm.bHasReply ? "Paste Link" : "Reply w/ Link";
var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

//
// ADD REPLY LINKS
//
var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function setReplyLink(elm) {
  var cmtURL='#'+elm.id;
  var cmtDateStr = getCmtDate(elm);

  var cmtDate = new Date(cmtDateStr);
  cmtDates[elm.id]=cmtDate.valueOf();
  if (isNaN(cmtDates[elm.id])) {
    DEBUG('NaN: "'+cmtDateStr+'"');
  }
  $j(cmtForm.replyElm,elm).append('<span class="meta-sep"> | </span><a class="comment-paste-link" title="'+sReplyTxt+'" href="'+cmtURL+'">'+sReplyTxt+'</a>');
}

// operates on an object inside the comment of interest. The comment is 2nd-level parent.
// the cmtDates[] array is not available; not certain why.
function pasteReplyLink() {
  var cmtElm = $j(this).parent();
  cmtElm=$j(cmtElm).parent(); // up one
  var cmtURL='#'+cmtElm.attr('id');
  var cmtAuth = $j(cmtForm.authElm,cmtElm).text().trim();
  var cmtDateStr = getCmtDate(elm);
  var cmtDate = new Date(cmtDateStr);
  var cmtM= months[cmtDate.getMonth()];
  var cmtHr = cmtDate.getHours();
  var cmtMin = cmtDate.getMinutes();
  if (cmtHr < 10) {cmtHr = '0'+cmtHr; }
  if (cmtMin < 10) {cmtMin = '0'+cmtMin; }
  var cmtFmtDate = cmtM+' '+cmtDate.getDate()+' '+cmtHr+':'+cmtMin;

  var myValue = ((cmtForm.bHasReply) && ($j(this).text()=='Paste Link')) ? '' : 'Re: ';
  myValue +='<a href="'+cmtURL+'">'+cmtAuth+' ('+cmtFmtDate+')</a>'+', ';

  var sel, startPos, endPos, scrollTop;
  myField=document.getElementById('comment');

  //IE
  if (document.selection) {
    myField.focus();
    sel = document.selection.createRange();
    sel.text = myValue;
    myField.focus();
  }
  //MOZILLA
  else if (myField.selectionStart || myField.selectionStart == '0') {
    startPos = myField.selectionStart;
    endPos = myField.selectionEnd;
    scrollTop = myField.scrollTop;
    myField.value = myField.value.substring(0, startPos)
                  + myValue
                      + myField.value.substring(endPos, myField.value.length);
    myField.focus();
    myField.selectionStart = startPos + myValue.length;
    myField.selectionEnd = startPos + myValue.length;
    myField.scrollTop = scrollTop;
  } else {
    myField.value += myValue;
    myField.focus();
  }
}

//
// Update each comment:
// - set Reply Link
// - color and/or hide as needed
//
function AgeComment(elm) {
  switch (getCommentAge(elm)) {
    case AGE_OLD:
      if (bHideOld) {
        (cmtForm.hideElm.length ? $j(cmtForm.hideElm,elm) : $j(elm)).css("display","none");
      } else if (bColorAge) { $j(elm).addClass("cmtOld"); }
      break;
    case AGE_NEW:
      if (bColorAge) { $j(elm).addClass("cmtNew"); }
      break;
    case AGE_NORM:
      if (bColorAge) { $j(elm).addClass("cmtNorm"); }
    }
  }

function FixComment(i) {
  if (!empty(this.id)) {
    setReplyLink(this) // only need to do this one time
    if (bHideOld || bColorAge) AgeComment(this)
  }
}

function setupComments() {
  console.log(cmtForm.listElm)
  console.log($j(cmtForm.listElm).length)
  setAgeValues();
  //$j(cmtForm.listID).css("display","none"); // hide them all for a bit
  //DEBUG('Comments hidden');
  $j(cmtForm.listElm).each(FixComment);


  if (bEnableOrder) {
    DEBUG('cmt ReOrdering:');
    if (bShowThreads) {
      DEBUG('Threaded, '+$j(cmtForm.threadElm).length+' items');
      if (bRecentLast) {
        $j(cmtForm.threadElm).sort(sortTreeIDasc).prependTo('#commentListOL');//threaded tree
      } else {
        $j(cmtForm.threadElm).sort(sortTreeIDdesc).prependTo('#commentListOL');//threaded tree
      }
    } else {
      DEBUG('Unthreaded, '+$j(cmtForm.listElm).length+' items');
      if (bRecentLast) {
        $j(cmtForm.listElm).sort(sortIDasc).prependTo('#commentListOL');//threaded tree
      } else {
        $j(cmtForm.listElm).sort(sortIDdesc).prependTo('#commentListOL');//threaded tree
      }
    }
    DEBUG('comments reordered');
  }

  $j('a.comment-paste-link').click(pasteReplyLink);
  $j('a.comment-reply-link').click(pasteReplyLink);
  DEBUG('comment links activated');

  //$j(cmtForm.listID).css("display","inline"); // restore the comments
  //DEBUG('comment display restored');
}

setupComments();

//
// UTILITY FUNCTIONS
//

//
// UI for CA-Assistant
//

function customizeMasthead() {

  if ($j('#wpa_menu').length) return;

  // Get the masthead.

  if (!$j(cmtForm.topDiv).length) return;

  // Make a container for the ca-assist menu.
  var wpaTitle = 'CA-Assist ['+siteType+'] ' + SCRIPT.version + ' (Build ' + SCRIPT.build + ') LOCAL';

  $j(cmtForm.topDiv).append(
    '<div id="wpa_menu" style="position: absolute; top: 30px; right: 25px; text-align: left; font-size: 11px; font-weight: bold; color: #FFD927">'+
    '<span id="wpa_settings">'+wpaTitle+'</span></div>');

  $j('span#wpa_settings').click(toggleSettings);

}

// ********************************************************************
// ********************************************************************
// DEBUG AND LOG BOX
// ********************************************************************
// ********************************************************************


function pad0(int, length) {
  return ("000" + int).slice(-length)
}

function logDate() {
  var now = new Date()
  return pad0(now.getHours(), 2) + ':' + 
    pad0(now.getMinutes(), 2) + ':' + 
    pad0(now.getSeconds(), 2) + ':' + 
    pad0(now.getMilliseconds(), 3)
}

function DEBUG(line) {
  dump(logDate() + ' ' + line +'\n')
}

function stripURI(img) {
  img = img.split('"')[1];
  return img.replace('" />', '');
}


// ********************************************************************
// ********************************************************************
// SETTINGS BOX
// ********************************************************************
// ********************************************************************

function toggleSettings() {
  settingsOpen ? closeSettings() : showSettings()
}

function showSettings() {
  createSettingsBox()
  document.getElementById('wpa_settingsBox').style.display = 'block'
  settingsOpen = true
}

function closeSettings() {
  var settingsBoxContainer = document.getElementById('wpa_settingsBox')
  settingsBoxContainer.parentNode.removeChild(settingsBoxContainer)
  settingsOpen = false
}

function createSettingsBox() {
  if (!document.getElementById('wpa_settings_css')) {
    makeElement('style', document.getElementsByTagName('head')[0], {'id':'wpa_settings_css', 'type':'text/css'}).appendChild(document.createTextNode(
      '#settingsBox .fancy_button{position:absolute;background-image:url(' + stripURI(redBgImage) + 
      ');border:1px solid #FFD927;color:#FFD927;cursor:pointer;display:block;float:left;font-size:14px;font-weight:700;padding:5px;text-decoration:none;width:auto}' +
      '#settingsBox .fancy_button button{background:transparent;border:medium none #FFF;color:#FFD927;cursor:pointer;font-size:14px;font-weight:700;margin:0}' +
      '#settingsBox .fancy_button button:hover{color:#BCD2EA;font-weight:700;text-decoration:none}' +
      '#settingsBox .tabcontent{display:block;top:20px;bottom:60px;left:10px;right:10px;}' +
      '#settingsBox div,#settingsBox select,#settingsBox textarea{position:absolute}' +
      '#settingsBox label {font-weight: normal; color: #BCD2EA}' +
      '#settingsBox #generalTab div,  #commentsTab div ' +
      '{position: static;}' +
      '#settingsBox #generalTab span, #commentsTab span ' +
      '{position: static; vertical-align: middle}' +
      '#settingsBox #generalTab select, #commentsTab select ' +
      '{position: static;}' +
      '#settingsBox #generalTab textarea, #commentsTab textarea ' +
      '{position: static;}' +
      '#settingsBox #generalTab input[type=radio], #commentsTab input[type=radio] ' +
      '{vertical-align: middle}' +
      '#settingsBox #generalTab input[type=checkbox],#commentsTab input[type=checkbox] ' +
      '{vertical-align: middle}' +
      '#settingsBox #generalTab input, #commentsTab input ' +
      '{position: static; margin: 0;}' +
      '#settingsBox #generalTab .lhs,  #commentsTab .lhs ' +
      '{position: static; width: 50%; float: left; text-align: right; padding: 3px;}' +
      '#settingsBox #generalTab .rhs, #commentsTab .rhs ' +
      '{position: static; float: left; padding: 3px;}' +
      '#settingsBox #generalTab .single, #commentsTab .single ' +
      ' {position: static; text-align: center}' +
      '#settingsBox #generalTab .caaHide, #commentsTab .caaHide ' +
      ' {clear: both; visibility: hidden;}'
    ));
  }

  // This creates the settings box
  var elt = makeElement('div', document.body, {'class':'generic_dialog pop_dialog', 'id':'wpa_settingsBox'});
  elt = makeElement('div', elt, {'class':'generic_dialog_popup', 'style':'top: 30px; width: 400px;'});
  elt = makeElement('div', elt, {'class':'pop_content popcontent_advanced', 'id':'pop_content'});
  var settingsBox = makeElement('div', elt, {'style':'position: fixed; top: 10px; right: 10px; width: 400px; height: 400px; font-size: 14px; z-index: 100; color: #BCD2EA; background: black; text-align: left; padding: 5px; border: 1px solid; border-color: #FFFFFF;', 'id':'settingsBox'});

  var generalTab = createGeneralTab();
  settingsBox.appendChild(generalTab);

  makeButton(settingsBox, 'left: 10px', 'Show', saveSettings)
  makeButton(settingsBox, 'left: 95px', 'Cancel', closeSettings)
  makeButton(settingsBox, 'left: 190px', 'Help', helpSettings)
  makeButton(settingsBox, 'right: 10px', 'Check Update', updateScript)
  
  DEBUG('Menu created.');
}

function makeButton(settingsBox, position, name, action) {
  var button = makeElement('span', settingsBox, {'class':'fancy_button', 'style':position+'; bottom: 10px;'})
  makeElement('button', button).appendChild(document.createTextNode(name))
  button.addEventListener('click', action, false)
}

function makeElement(type, appendto, attributes) {
  var element = document.createElement(type)
  if (attributes)
    for (var i in attributes)
      element.setAttribute(i, attributes[i])
  if (appendto)
    appendto.appendChild(element)
  return element
}

function checked(bool) {
  return bool ? ' checked="checked"' : ''
}

// Create General Tab
function createGeneralTab() {
  var title, id, label;
  var generalTab = makeElement('div', null, {'id':'generalTab', 'class':'tabcontent', 'style':'width:380px;background: #003;'});

  // Container for a list of settings.
  var list = makeElement('div', generalTab, {'style':'position: relative; top: 10px; margin-left: auto; margin-right: auto; width: 98%; line-height:125%;'});

  // Site Fixup options
  var sFixups = ''+
'<div><b>Recent Comments</b><br/>\n'+
' <div class="lhs">\n'+
'   <label for="bReorgRcntCmt" title="Check this to reorganize the Recent Comments sidebar.">Commenter by thread:</label>\n'+
' </div>\n'+
' <div class="rhs">\n'+
'   <input id="bReorgRcntCmt" type="checkbox" title="Check this to reorganize the Recent Comments sidebar." style="vertical-align: middle;" value="checked"'+checked(bReorgRcntCmt)+'/>\n'+
' </div>\n'+
'</div>\n'+
'<br class="caaHide"/>\n'+
'<br class="caaHide"/>\n';

  $j(list).append(sFixups);

  // New/old comment timing
  var sNewOld=''+
'<div><b>Comment Age</b><br/>\n'+
' <div class="lhs">\n'+
'   <label for="isNew" title="Comment ages for coloring and hiding.">Define comment ages:</label>\n'+
' </div>\n'+
' <div class="rhs">\n'+
'   <input id="isNew" type="text" value="'+isNew+'" size="1" style="vertical-align: middle; text-align: center;"/>\n'+
'   <label for="bHideOld"> (new) to </label><br/>\n'+
'   <input id="isOld" type="text" value="'+isOld+'" size="1" style="vertical-align: middle; text-align: center;"/>\n'+
'   <label for="bHideOld"> (old) hours.</label>\n'+
' </div>\n'+
'</div>\n'+
'<br class="caaHide"/>\n'+
'<div>\n'+
' <div class="lhs">\n'+
'   <label for="bColorAge" title="Check to color newer comments according to indicated time intervals.">Color new comments:</label>\n'+
' </div>\n'+
' <div class="rhs">\n'+
'   <input id="bColorAge" type="checkbox" title="Check to color newer comments according to indicated time intervals." style="vertical-align: middle;" value="checked"' + checked(bColorAge) + '/>\n'+
' </div>\n'+
'</div>\n'+
'<br class="caaHide"/>\n'+
'<div>\n'+
' <div class="lhs">\n'+
'   <label for="bHideOld" title="Check to hide older comments."> Hide old comments:</label>\n'+
' </div>\n'+
' <div class="rhs">\n'+
'   <input id="bHideOld" type="checkbox" title="Check to hide older comments." style="vertical-align: middle;" value="checked"' + checked(bHideOld) +'/>\n'+
' </div>\n'+
'</div>\n'+
'<br class="caaHide"/>\n'+
'';

  $j(list).append(sNewOld);

  // Comment threading
var sThreadDisplay = ''+
'<br/><div><b>Comment Order</b><br/>\n'+
'(On largest pages, can take a few seconds)<br/>\n'+
'<div>\n'+
' <div class="lhs">\n'+
'   <label for="bEnableOrder" title="Check to enable comment reordering">Enable reordering:</label>\n'+
' </div>\n'+
' <div class="rhs">\n'+
'   <input id="bEnableOrder" type="checkbox" style="vertical-align: middle;" title="Check to enable comment reordering" value="checked"' + checked(bEnableOrder) +'/>\n'+
' </div>\n'+
'<br class="caaHide"/>\n'+
'</div>\n'+
' <div class="lhs">\n'+
'   <label for="bShowThreads" title="Use threaded display for comments (if site supports it)"> Threaded display:</label>\n'+
' </div>\n'+
' <div class="rhs">\n'+
'   <input id="bShowThreads" type="checkbox" style="vertical-align: middle;" value="checked"' + checked(bShowThreads) +'/>\n'+
'   <label title="Use threaded display for comments (if site supports it)"> (if site supports it)</label>\n'+
' </div>\n'+
'</div>\n'+
'<br class="caaHide"/>\n'+
'<div>\n'+
' <div class="lhs">\n'+
'   <label for="bRecentLast" title="Check to show most-recent comments at the end">Newest at end:</label>\n'+
' </div>\n'+
' <div class="rhs">\n'+
'   <input id="bRecentLast" type="checkbox" style="vertical-align: middle;" title="Check to show most-recent comments at the end" value="checked"' + checked(bRecentLast) +'/>\n'+
' </div>\n'+
'<br class="caaHide"/>\n'+
'</div>\n'+
'';

  $j(list).append(sThreadDisplay);

  return generalTab;
}

function helpSettings() {
  window.open('http://climateaudit.org/ca-assistant/');
}

function saveSettings() {

  isNew = $j('#isNew')[0].value
  isOld = $j('#isOld')[0].value
  bColorAge = $j('#bColorAge')[0].checked
  bHideOld = $j('#bHideOld')[0].checked
  bShowThreads = $j('#bShowThreads')[0].checked
  bRecentLast = $j('#bRecentLast')[0].checked
  bEnableOrder = $j('#bEnableOrder')[0].checked
  bReorgRcntCmt = $j('#bReorgRcntCmt')[0].checked

  GM_setValue('isNew', isNew)
  GM_setValue('isOld', isOld)
  GM_setValue('bColorAge', bColorAge)
  GM_setValue('bHideOld', bHideOld)
  GM_setValue('bShowThreads', bShowThreads)
  GM_setValue('bRecentLast', bRecentLast)
  GM_setValue('bEnableOrder', bEnableOrder)
  GM_setValue('bReorgRcntCmt', bReorgRcntCmt)

  closeSettings()
  
  location.reload()
}

$j(document).ready(function() {

		var show_text = 'Preview';
		var hide_text = 'Hide preview';
		var textarea = $j('textarea[name="comment"]');
		if (!textarea) {
			alert('Not a comment page');
			return;
		}
		
		var textarea_id = '#' + $j(textarea).attr('id');
		var comment = '';

	$j(textarea_id).wrap('<div id="ca-cmt-wrap"></div>');
	$j(textarea_id).before('<div id="ca-cmt-preview"></div>');
	$j('#ca-cmt-preview').prepend('<div id="preview-tab"><div><a>'+ show_text +'</a></div></div>');

	$j('#preview-tab div').toggle(
			function() {
			comment = $j(textarea_id).val();
			if ($j(textarea_id).val() != '') comment = comment + '\n\n';
				comment_preview = comment.replace(/(<\/?)script/g,'$1noscript')
				.replace(/(<blockquote[^>]*>)/g, '\n$1')
				.replace(/(<\/blockquote[^>]*>)/g, '$1\n')
				.replace(/\r\n/g, '\n')
				.replace(/\r/g, '\n')
				.replace(/\n\n+/g, '\n\n')
				.replace(/\n?(.+?)(?:\n\s*\n)/g, '<p>$1</p>')
				.replace(/<p>\s*?<\/p>/g, '')
				.replace(/<p>\s*(<\/?blockquote[^>]*>)\s*<\/p>/g, '$1')
				.replace(/<p><blockquote([^>]*)>/ig, '<blockquote$1><p>')
				.replace(/<\/blockquote><\/p>/ig, '</p></blockquote>')
				.replace(/<p>\s*<blockquote([^>]*)>/ig, '<blockquote$1>')
				.replace(/<\/blockquote>\s*<\/p>/ig, '</blockquote>')
				.replace(/\s*\n\s*/g, '<br />');

				var preview_html = '<ol id="cmt-preview"><li>'+ comment_preview +'</li></ol>';

			$j(textarea).after('<div id="textarea_clone"></div>');
			$j(textarea).clone().appendTo($j('#textarea_clone'));
			$j('#textarea_clone textarea').text(comment);
			$j('#textarea_clone').hide();
			$j(textarea).replaceWith('<div id="comment_preview"></div>');
			$j('#comment_preview').html(preview_html);
			$j('#preview-tab a').text(hide_text);
			$j('#html-editor button').hide();
			},
			function() {
			$j('#textarea_clone').remove();
			$j('#comment_preview').replaceWith(textarea);
			$j(textarea_id).text(comment);
			$j('#preview-tab a').text(show_text);
			$j('#html-editor button').show();
			}
		)


		var html_editor = '<div id="html-editor"><button style="display: block;" id="ed_strong" title="Bold">strong</button><button style="display: block;" id="ed_em" title="Italic">em</button><button style="display: block;" id="ed_link" title="Link">a[href=""]</button><button style="display: block;" id="ed_blockquote" title="Insert Quote">blockquote</button><button style="display: block;" title="Superscript" id="ed_sup">sup</button><button style="display: block;" title="Subscript" id="ed_sub">sub</button><button style="display: block;" title="Less-Than symbol" id="ed_lt">lt</button><button style="display: block;" title="Strikeout" id="ed_del">del</button><button style="display: block;" title="Underscore" id="ed_under">under</button><button style="display: block;" id="ed_code" title="Source Code">code</button><button style="display: block;" title="LaTeX code" id="ed_latex">latex</button><button style="display: block;" title="Insert Image"  id="ed_img">img[src=""]</button></div>';

	$j('#ca-cmt-preview').prepend(html_editor);
	
	function setSelect(element,iStart, iLength) {
    if (element.createTextRange) {
        var oRange = element.createTextRange();
        oRange.moveStart("character", iStart);
        oRange.moveEnd("character", iLength - element.value.length);
        oRange.select();
    } else if (element.setSelectionRange) {
        element.setSelectionRange(iStart, iStart+iLength);
    }
};

		function insert(start, end, core) {
			element = document.getElementById('comment');
			if (document.selection) {
				element.focus();
				sel = document.selection.createRange();
				sel.text = start + sel.text + end;
			} else if (element.selectionStart || element.selectionStart == '0') {
				element.focus();
				var startPos = element.selectionStart;
				var endPos = element.selectionEnd;
				if (startPos == endPos) {
					element.value = element.value.substring(0, startPos) + start + core + end + element.value.substring(endPos, element.value.length);
					setSelect(element,startPos+start.length,core.length)
				} else {
					element.value = element.value.substring(0, startPos) + start + element.value.substring(startPos, endPos) + end + element.value.substring(endPos, element.value.length);
			}
			} else {
				element.value += start + core + end;
				setSelect(element,start.length,core.length)
				
			}
		}
		
	$j('#html-editor button').click(function() {
		var button_id = attribs = $j(this).text();
		button_id = button_id.replace(/\[.*\]/, '');
		if (/\[.*\]/.test(attribs)) { attribs = attribs.replace(/.*\[(.*)\]/, ' $1'); } else attribs = '';
		var start = '';
		var end = '';
		var core='';
		switch (button_id) {
		case 'lt':
			start = '&lt;';break;
		case 'img':
			var URL = prompt('Enter the URL of the image', 'http://');
			if (URL) {
				start = '<img src="' 
					+ URL 
					+ '" alt="' + prompt('Enter a description of the image', '') 
					+ '" width="' + prompt('Enter image width (e.g. 400) or leave blank for natural size', '') 
					+ '" />';
			} else {
				start = '<img src="';end='" alt="" width="" />';
				core='URL_here_with_NO_spaces_at_all...Just_paste_over_this_message!';
			}
			break;
		case 'latex':
			start = '$latex ';end=' $';
			core='LaTeX here. Leave blank at both ends!';break;
		case 'code':
			start = '[sourcecode]';
			end   = '[/sourcecode]';break;
		case 'a': 
			var URL = prompt('Enter the URL' ,'http://');
			if (URL) {
				start = '<a href="' + URL + '">';
				core='LinkText Here';
				end="</a>";
			} else {
				start = '<a href="';end='">LinkText Here</a>';
				core='URL_here_with_NO_spaces_at_all...Just_paste_over_this_message!';
			}
			break;
		default:
			start = '<'+button_id+attribs+'>';
			end = '</'+button_id+'>';
		}
		insert(start, end, core);
		return false;
	})

}) 

//update the script (by Richard Gibson; changed by ms99 and blannie)
function updateScript() {
  try {
    console.log('try')
    GM_xmlhttpRequest({
      method: 'GET',
      url: SCRIPT.url + '?source', // don't increase the 'installed' count; just for checking
      onload: function(result) {
        console.log('onload')
        if (result.status != 200) {
          return;
        }
        if (!result.responseText.match(/build:\s+'(\d+)/)) return;
        var theOtherBuild = parseInt(RegExp.$1);
        var runningBuild = parseInt(SCRIPT.build);
        var theOtherVersion = result.responseText.match(/@version\s+([\d.]+)/)? RegExp.$1 : '';
        if (theOtherBuild < runningBuild) {
          if (window.confirm('You have a beta version (build ' + runningBuild + ') installed.\n\nDo you want to DOWNGRADE to the most recent official release (version ' + theOtherVersion + ')?\n')) {
            window.location.href = SCRIPT.url;
          }
          return;
        } else if (theOtherBuild > runningBuild ||
                   theOtherVersion != SCRIPT.version) {
          if (window.confirm('Version ' + theOtherVersion + ' is available!\n\n' + 'Do you want to upgrade?' + '\n')) {
            window.location.href = SCRIPT.url;
          }
        } else {
          alert('You already have the latest version.');
          return;
        }
      }
    });
  } catch (ex) {
    console.log(ex)
  }
}
