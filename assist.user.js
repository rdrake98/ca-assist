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
// @description Enhanced user experience on climate blogs courtesy of Climate Audit and MrPete
// @version     0.1
// @copyright   2009+, MrPete, Richard Drake and friends. All right reserved
// @license     GPL version 3 or any later version; http://www.gnu.org/copyleft/gpl.html
// @include     http://climateaudit.org/*
// @include     http://judithcurry.com/*
// @include     http://dev.whiteword.com/assist/*
// @include     http://rankexploits.com/musings/*
// @include     http://wattsupwiththat.com/*
// @require     jquery.min.js
// @require     moment.min.js
// @require     environment.js
// @require     images.js
// @resource    styles styles.css
// @grant       GM_getResourceText
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_xmlhttpRequest
// ==/UserScript==

LOG('hostname: ' + location.hostname)

if (window.top != window.self) return //don't run on frames or iframes

var SCRIPT = { // no automatic updates
  url: null,
  version: '0.1',
  build: '44',
}

var $j = jQuery.noConflict()

$j('head').append("<style>\n" + GM_getResourceText('styles') + "\n</style>") 

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
  case 'rankexploits.com': siteType='Lucia'; break;
  case 'wattsupwiththat.com': siteType='WUWT'; break;
  case 'dev.whiteword.com':
    siteType=location.pathname.split('/')[2].split('.')[0].slice(0,-1);
    break;
}
LOG('Site type: ' + siteType)

//listSelector where to find the comment list
//bSeqDate true if date element precedes each comment element (WUWT)
//dtRegEx string for finding date/time--convert to regex
//dtRegRep string for date/time result
//itemElm  how to find each comment in the list
//dateText how to find date text, given we're pointing to the comment (or preceding item)
//replyElm on which element to attach the Paste Reply link
//bHasReply true if there's a reply link on each comment (otw, Paste Link will say "Re:")

var cmtForm = {
  flat: false,
  listSelector: '#comments-list ol',
  listElm: '#commentListOL li',
  hideElm: '',
  bSeqDate: 0,
  topDiv: '#header', 
  replyElm: '.comment-meta:first',
  authElm: '.comment-author:first',
  dateText: '.comment-meta:first', 
  bHasReply: true,
}

var cmtFormDiffs = {
  CE: { 
    listSelector: '.commentlist',
    dateText: 'span.commentmetadata a:first-child',
  },
  Lucia: {
    flat: true,
    listSelector: 'div.commentlist',
    listElm: 'div.comment',
    topDiv: '#bodyinner',
    replyElm: '.commentmetadata',
    authElm: '.comment-author',
    dateText: '.comment-date', 
    bHasReply: false,
  },
  WUWT: {
    flat: true,
    listSelector: 'dl.commentlist',
    listElm: '#commentListOL > div',
    bSeqDate: 1,
    replyElm: 'span.commentmetadata',
    dateText: 'span.commentmetadata',
    bHasReply: false,
  },
}

if (cmtFormDiffs[siteType])
  $j.extend(cmtForm, cmtFormDiffs[siteType])

if (cmtForm.flat)
  flattenHierarchy = true

function getCommentDate(elm) {
  var txt = $j(cmtForm.dateText,elm).text()
  txt = siteType == 'CE' ? txt.split("\n")[1].trim() : txt
  // optional 'Posted ', then mm ddth, yyyy at hh:mm pm
  txt = txt.split('|',1)[0] // remove any option stuff at the end...
  var sRep='$1$3 $4'
  return txt.replace(/(?:Posted )?([A-Za-z]+ [0-9]+)([a-z]*)(, [0-9]+) at ([0-9]+:[0-9]+ (AM|PM))+/i, sRep).trim()
}

var settingsOpen = false

DEBUG('Completed initialize.')

/////////////////////////////////////////////////////////////////
// Reorganize Recent Comments Sidebar
/////////////////////////////////////////////////////////////////

if (commentsByThread) {
  var elmRC = $j('ul#recentcomments')
  var rcList= new Array()
  if (elmRC.length) {
    $j('.recentcomments').each(function (i) {
        var elmLinks=$j('a',this)
        switch (elmLinks.length) {
          case 1: 
            var elm= $j(this).get(0)
            var sAuth = elm.childNodes[0].textContent
            sAuth = sAuth.substring(0, sAuth.length-4)
            var sURL  = $j(elmLinks).attr('href')
            var sTopic = $j(elmLinks).text()
            break
          case 2: // Author has link
            var elmA =  $j('a:first',this)
            var sAuth = elmA.text()
            elmA = elmA.next()
            var sURL = elmA.attr('href')
            var sTopic = elmA.text()
            break
        }
        if (rcList[sTopic] == undefined) { rcList[sTopic]=''; }
        rcList[sTopic] += 
          '<li class="recentcomments"><a href="'+sURL+'" title="View the comment by ' +
          sAuth + '"><span class="commentAuthor">'+sAuth+'</span></a></li>\n'
    })
    var sOut=''
    for (rcKey in rcList)
      sOut += '<h4 class="recentCommentsPostTitle">'+rcKey+'</h4>\n' +
              '<ul>\n'+rcList[rcKey]+'\n</ul>\n'
    $j(elmRC).html(sOut)
  }
}

/////////////////////////////////////////////////////////////////
// functions on comment pages
/////////////////////////////////////////////////////////////////

LOG(cmtForm.listSelector)
LOG($j(cmtForm.listSelector).length)
DEBUG('Initial site-dependent comment page prep');
if (!$j(cmtForm.listSelector).length) { // don't waste time on non-comment pages
  DEBUG('Not a comment page');
  return;
}

$j(cmtForm.listSelector).attr('id','commentListOL');

DEBUG('Define main comment page functions');

var commentDates = []
var cmtOldAge, cmtNewAge

customizeMasthead();

function customizeMasthead() {

  var wpaTitle = 'Assist+ ' + SCRIPT.version + 
    ' build ' + SCRIPT.build + 
    ' for ' + siteType +
    ' ' + moment(currentTime).fromNow()

  $j(cmtForm.topDiv).append(
    '<div id="wpa_menu" style="position: absolute; top: 30px; right: 25px; text-align: left; font-size: 11px; font-weight: bold; color: #FFD927">'+
    '<span id="wpa_settings">'+wpaTitle+'</span></div>')

  $j('span#wpa_settings').click(toggleSettings)

}

function setAgeValues() {
  cmtOldAge = currentTime.valueOf() - isOld*60*60*1000
  cmtNewAge = currentTime.valueOf() - isNew*60*60*1000
}

const AGE_OLD  = 0
const AGE_NORM = 1
const AGE_NEW  = 2

function getCommentAge(elm) {
  var cmtAge = commentDates[elm.id]
  if (cmtAge <= cmtOldAge) return AGE_OLD
  if (cmtAge >= cmtNewAge) return AGE_NEW
  return AGE_NORM
}

function getCommentNumber(cmt) {
  var id=cmt.id;
  return 0+id.split('-').slice(-1);
}

function setReplyLink(elm) {
  var cmtURL='#'+elm.id
  var dateString = getCommentDate(elm)

  var commentDate = new Date(dateString)
  commentDates[elm.id] = commentDate.valueOf()
  var sReplyTxt= cmtForm.bHasReply ? "Paste Link" : "Reply w/ Link"
  $j(cmtForm.replyElm,elm).append(
    '<span class="meta-sep"> | </span><a class="comment-paste-link" title="'+
    sReplyTxt+'" href="'+cmtURL+'">'+sReplyTxt+'</a>'
  )
}

// operates on an object inside the comment of interest. The comment is 2nd-level parent.
// the commentDates[] array is not available; not certain why.
function pasteReplyLink() {
  var cmtElm = $j(this).parent()
  cmtElm=$j(cmtElm).parent() // up one
  var cmtURL='#'+cmtElm.attr('id')
  var cmtAuth = $j(cmtForm.authElm,cmtElm).text().trim()
  var dateString = getCommentDate(elm)
  var commentDate = new Date(dateString)
  var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  var cmtM= months[commentDate.getMonth()]
  var cmtHr = commentDate.getHours()
  var cmtMin = commentDate.getMinutes()
  if (cmtHr < 10) { cmtHr = '0'+cmtHr }
  if (cmtMin < 10) { cmtMin = '0'+cmtMin }
  var cmtFmtDate = cmtM+' '+commentDate.getDate()+' '+cmtHr+':'+cmtMin

  var myValue = cmtForm.bHasReply && $j(this).text()=='Paste Link' ? '' : 'Re: '
  myValue += '<a href="'+cmtURL+'">'+cmtAuth+' ('+cmtFmtDate+')</a>'+', '

  var sel, startPos, endPos, scrollTop
  myField = $("#comment")[0]

  if (myField.selectionStart || myField.selectionStart == '0') { // Firefox
    startPos = myField.selectionStart
    endPos = myField.selectionEnd
    scrollTop = myField.scrollTop
    myField.value = myField.value.substring(0, startPos) + myValue +
                    myField.value.substring(endPos, myField.value.length)
    myField.focus()
    myField.selectionStart = startPos + myValue.length
    myField.selectionEnd = startPos + myValue.length
    myField.scrollTop = scrollTop
  } else {
    myField.value += myValue
    myField.focus()
  }
}

//
// Update each comment:
// - set Reply Link
// - color and/or hide as needed
//
function ageComment(elm) {
  switch (getCommentAge(elm)) {
    case AGE_OLD:
      if (flattenHierarchy && hideOld)
        (empty(cmtForm.hideElm) ? $j(elm) : $j(cmtForm.hideElm, elm)).addClass("cmtHidden")
      else if (colorByAge) $j(elm).addClass("cmtOld")
      break
    case AGE_NEW:
      if (colorByAge) $j(elm).addClass("cmtNew")
      break
    case AGE_NORM:
      if (colorByAge) $j(elm).addClass("cmtNorm")
  }
}

function fixComment(i) {
  if (!empty(this.id)) {
    setReplyLink(this) // only need to do this one time
    if (hideOld || colorByAge) ageComment(this)
  }
}

function sortIDasc(a,b) { return a.id > b.id ? 1 : -1 }

function sortIDdesc(a,b) { return a.id < b.id ? 1 : -1 }

function setupComments() {
  LOG(cmtForm.listElm)
  LOG($j(cmtForm.listElm).length)
  setAgeValues()
  $j(cmtForm.listElm).each(fixComment)
  if (flattenHierarchy)
    if (newestAtStart)
      $j(cmtForm.listElm).sort(sortIDdesc).prependTo('#commentListOL')
    else
      $j(cmtForm.listElm).sort(sortIDasc).prependTo('#commentListOL')
  $j('a.comment-paste-link').click(pasteReplyLink)
  $j('a.comment-reply-link').click(pasteReplyLink)
}

setupComments();

// ********************************************************************
// DEBUG 
// ********************************************************************

function DEBUG(line) {
  dump('A+'+moment().format('hh:mm:ss:SSS')+' '+line+'\n')
}

function LOG(object) {
  console.log(object)
  DEBUG(object.toString())
}

// ********************************************************************
// SETTINGS
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

function stripURI(img) {
  img = img.split('"')[1]
  return img.replace('" />', '')
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
  var elt = makeElement('div', document.body, {'class':'generic_dialog pop_dialog', 'id':'wpa_settingsBox'})
  elt = makeElement('div', elt, {'class':'generic_dialog_popup', 'style':'top: 30px; width: 340px;'})
  elt = makeElement('div', elt, {'class':'pop_content popcontent_advanced', 'id':'pop_content'})
  var settingsBox = makeElement('div', elt, {'style':'position: fixed; top: 10px; right: 10px; width: 340px; height: 240px; font-size: 14px; z-index: 100; color: #BCD2EA; background: black; text-align: left; padding: 5px; border: 1px solid; border-color: #FFFFFF;', 'id':'settingsBox'})

  var generalTab = createGeneralTab()
  settingsBox.appendChild(generalTab)

  makeButton(settingsBox, 'left: 10px', 'Update', updateScript)
  makeButton(settingsBox, 'left: 104px', 'Help', helpSettings)
  makeButton(settingsBox, 'left: 181px', 'Cancel', closeSettings)
  makeButton(settingsBox, 'right: 10px', 'Show', saveSettings)
  
  var flatten = $j('#flattenHierarchy')
  if (cmtForm.flat)
    flatten.prop("disabled", true)
  else {
    enable_checkboxes_based_on(flatten[0])
    flatten.click(enable_checkboxes)
  }
}

function enable_checkboxes_based_on(flatten) {
  $j('#newestAtStart').prop("disabled", !flatten.checked)
  $j('#hideOld').prop("disabled", !flatten.checked)
}

function enable_checkboxes() {
  enable_checkboxes_based_on(this)
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

function createGeneralTab() {
  var generalTab = makeElement('div', null, 
    {'id':'generalTab', 'class':'tabcontent', 'style':'width:320px;background: #003;'}
  )
  var list = makeElement('div', generalTab, 
    {'style': 'position: relative; top: 10px; margin-left: auto; margin-right: auto; width: 98%; line-height: 125%;'}
  )
  $j(list).append(
' <div class="lhs">\n'+
'   <p style="vertical-align: bottom; line-height: 180%;">\n'+
'   <label for="isNew" title="Comment ages for coloring and hiding">Define comment ages:</label>\n'+
'   </p>\n'+
' </div>\n'+
' <div class="rhs">\n'+
'   <input id="isNew" type="text" value="'+isNew+'" size="4" style="vertical-align: middle; text-align: center;"/>\n'+
'   <label for="isNew"> new to </label><br/>\n'+
'   <input id="isOld" type="text" value="'+isOld+'" size="4" style="vertical-align: middle; text-align: center;"/>\n'+
'   <label for="isOld"> old in hours</label>\n'+
' </div>\n'+
'<br class="caaHide"/>\n'+
'<div>\n'+
' <div class="lhs">\n'+
'   <label for="colorByAge" title="Check to color newer comments according to indicated time intervals.">Color by age:</label>\n'+
' </div>\n'+
' <div class="rhs">\n'+
'   <input id="colorByAge" type="checkbox" title="Check to color newer comments according to indicated time intervals." style="vertical-align: middle;" value="checked"' + checked(colorByAge) + '/>\n'+
' </div>\n'+
'</div>\n'+
'<br class="caaHide"/>\n' +
' <div class="lhs">\n'+
'   <label for="flattenHierarchy" title="Check to enable comment reordering">Flatten hierarchy:</label>\n'+
' </div>\n'+
' <div class="rhs">\n'+
'   <input id="flattenHierarchy" type="checkbox" style="vertical-align: middle;" title="Check to enable comment reordering" value="checked"' + checked(flattenHierarchy) +'/>\n'+
' </div>\n'+
'<br class="caaHide"/>\n'+
'<div>\n'+
' <div class="lhs">\n'+
'   <label for="newestAtStart" title="Check to show most-recent comments at the end">Newest at start:</label>\n'+
' </div>\n'+
' <div class="rhs">\n'+
'   <input id="newestAtStart" type="checkbox" style="vertical-align: middle;" title="Check to show most-recent comments at the end" value="checked"' + checked(newestAtStart) +'/>\n'+
' </div>\n'+
'</div>\n'+
'<br class="caaHide"/>\n'+
'<div>\n'+
' <div class="lhs">\n'+
'   <label for="hideOld" title="Check to hide older comments.">Hide old:</label>\n'+
' </div>\n'+
' <div class="rhs">\n'+
'   <input id="hideOld" type="checkbox" title="Check to hide older comments." style="vertical-align: middle;" value="checked"' + checked(hideOld) +'/>\n'+
' </div>\n'+
'</div>\n'
  )
  return generalTab
}

function updateScript() {
  window.open('https://github.com/rdrake98/ca-assist/raw/dev/assist.user.js')
}

function helpSettings() {
  window.open('http://climateaudit.org/ca-assistant/')
}

function saveSettings() {

  GM_setValue('isNew', isNew = $j('#isNew')[0].value)
  GM_setValue('isOld', isOld = $j('#isOld')[0].value)
  GM_setValue('colorByAge', colorByAge = $j('#colorByAge')[0].checked)
  if (!cmtForm.flat) { // don't let Lucia flatten CA
    flattenHierarchy = $j('#flattenHierarchy')[0].checked
    GM_setValue('flattenHierarchy', flattenHierarchy)
  }
  GM_setValue('newestAtStart', newestAtStart = $j('#newestAtStart')[0].checked)
  GM_setValue('hideOld', hideOld = $j('#hideOld')[0].checked)

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
