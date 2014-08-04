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
// @include     http://rdrake98.wordpress.com/*
// @require     license.js
// @require     jquery.min.js
// @require     moment.min.js
// @require     environment.js
// @require     hosts.js
// @require     images.js
// @resource    styles styles.css
// @grant       GM_getResourceText
// @grant       GM_getValue
// @grant       GM_setValue
// ==/UserScript==

if (window.top != window.self) return // don't run on frames or iframes
console.log('Host name: ' + hostname)
console.log('Site type: ' + siteType)

var SCRIPT = { // no automatic updates
  url: null,
  version: '0.1',
  build: '44',
}

var $j = jQuery.noConflict()

$j('head').append("<style>\n" + GM_getResourceText('styles') + "\n</style>")

var siteSpec = {
  flat: false,
  hasReply: true, // there's a reply link on all comments not at maximum depth
  topDiv: '#header',
  commentList: '.commentlist',
  comment: '.highlander-comment:not(.pingback)',
  date: '.comment-meta:first',
  author: '.comment-author:first',
  replyParent: '.comment-meta:first', // element on which to attach Reply+
  textarea: '#reply-title',
}

var siteSpecSpecifics = {
  CA: {
    commentList: '#comments-list ol',
  },
  CE: {
    date: 'span.commentmetadata a:first-child',
    author: 'cite',
  },
  Lucia: {
    flat: true,
    hasReply: false,
    topDiv: '#bodyinner',
    comment: 'div.comment',
    date: '.comment-date',
    author: '.comment-author',
    replyParent: '.commentmetadata',
    textarea: '#commentform',
  },
  WUWT: {
    flat: true,
    hasReply: false,
    date: '.commentmetadata',
    author: '.comment-author .fn',
    replyParent: '.commentmetadata',
  },
  RD: {
    date: '.commentmetadata:first a:first',
    author: 'cite:first',
    replyParent: '.commentmetadata:first',
  },
}

if (siteSpecSpecifics[siteType])
  $j.extend(siteSpec, siteSpecSpecifics[siteType])

if (siteSpec.flat)
  flattenHierarchy = true

function getCommentDate(elm) {
  // produce something like March 24, 2013 03:25 pm
  // CA alone has Posted, Lucia alone has 24th, not 24
  var txt = $j(siteSpec.date,elm).text()
  var regex = /(|Posted )(\w+ \d+)(|ST|ND|RD|TH)(, \d+) at (\d+:\d+ (AM|PM))+/i
  txt = txt.match(regex)[0] // remove other random stuff
  return txt.replace(regex, '$2$4 $5')
}

var settingsOpen = false

////////////////////////////////////////////////////////////////////////////////
// Recent Comments Sidebar
////////////////////////////////////////////////////////////////////////////////

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

////////////////////////////////////////////////////////////////////////////////
// Masthead
////////////////////////////////////////////////////////////////////////////////

function customizeMasthead() {
  var label = 'Assist+ ' + SCRIPT.version +
    ' build ' + SCRIPT.build +
    ' for ' + siteType
  $j(siteSpec.topDiv).append(
    '<div id="wpa_menu"><span id="wpa_settings" style="color: #003">'+
    label+'</span></div>'
  )
  $j('span#wpa_settings').click(toggleSettings)
}

customizeMasthead()

////////////////////////////////////////////////////////////////////////////////
// Functions on comment pages
////////////////////////////////////////////////////////////////////////////////

console.log(siteSpec.commentList)
var commentParent = $j(siteSpec.commentList)
if (empty(commentParent)) return // no more to do on non-comment pages
console.log(commentParent[0])

var commentDates = []
var cmtOldAge, cmtNewAge

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
  var id=cmt.id
  return 0+id.split('-').slice(-1)
}

function setReplyLink(elm) {
  var commentDate = new Date(getCommentDate(elm))
  commentDates[elm.id] = commentDate.valueOf(commentDate)
  var label = siteSpec.hasReply ? "Reply+" : "Reply"
  var replyParent = $j(siteSpec.replyParent,elm)
  replyParent.append(
    '<span class="meta-sep"> | </span><a class="comment-paste-link" title="'+
    label+'" href="'+siteSpec.textarea+'">'+label+'</a>'
  )
}

function firefoxSelection() {
  return (window.getSelection() || '').toString().trim()
}

// operates on an object inside the comment of interest
// the commentDates[] array is not available, it's in the GM script scope
function pasteReplyLink() {
  var elm = $j(this).parents(siteSpec.comment).first()
  var author = $j(siteSpec.author,elm).first().text().trim()
  console.log(author)
  var dateString = getCommentDate(elm)
  console.log(dateString)
  var url='#'+elm[0].id
  var now = moment(currentTime)
  var date = moment(new Date(dateString))
  format = now.diff(date, 'years') > 1 ? 'MMM D, YYYY ' : 'MMM D '
  format = (now.diff(date, 'days') > 1 ? format : '') + 'h:mm '
  // CA uses PM not pm
  format += (siteType == 'CA' ? 'A' : 'a')
  var text = author+' (<a href="'+url+'">'+date.format(format)+'</a>): '
  var selection = firefoxSelection()
  if (!empty(selection))
    text += '\n<blockquote>' + selection + '</blockquote>\n'
  var area = $j("#comment")[0]
  area.value = text
  area.scrollTop = area.scrollHeight
}

function ageComment(elm) {
  var age = getCommentAge(elm)
  var clas = ["cmtOld", "cmtNorm", "cmtNew"][age]
  if (age == AGE_OLD && flattenHierarchy && hideOld) clas = "cmtHidden"
  $j(elm).addClass(clas)
}

function fixComment() {
  setReplyLink(this)
  var commentDate = new Date(getCommentDate(this))
  commentDates[this.id] = commentDate.valueOf(commentDate)
  if (hideOld || colorByAge) ageComment(this)
}

function setupComments() {
  console.log(siteSpec.comment)
  var comments = $j(siteSpec.comment)
  console.log(comments.length)
  setAgeValues()
  comments.each(fixComment)
  if (flattenHierarchy && (!siteSpec.flat || newestAtStart))
    comments.sort(
      newestAtStart ?
        function(a,b) { return a.id < b.id ? 1 : -1 } :
        // for WUWT and Lucia should do nothing
        function(a,b) { return a.id > b.id ? 1 : -1 }
    // prepend wrong for Lucia, append wrong for CE
    ).prependTo(commentParent)
  $j('a.comment-paste-link').click(pasteReplyLink)
}

setupComments()

////////////////////////////////////////////////////////////////////////////////
// Settings
////////////////////////////////////////////////////////////////////////////////

function toggleSettings() {
  settingsOpen ? closeSettings() : showSettings()
}

function showSettings() {
  createSettingsBox()
  settingsOpen = true
}

function closeSettings() {
  $j('#wpa_settingsBox').remove()
  settingsOpen = false
}

function stripURI(img) {
  img = img.split('"')[1]
  return img.replace('" />', '')
}

function createSettingsBox() {
  if (!document.getElementById('wpa_settings_css')) {
    makeElement(
      'style',
      document.getElementsByTagName('head')[0],
      {id:'wpa_settings_css', type:'text/css'}
    ).appendChild(document.createTextNode(
      '#settingsBox .fancy_button{background-image:url('+stripURI(redBgImage)+')}'
    ))
  }

  var elt = makeElement('div', document.body, {id:'wpa_settingsBox'})
  var settingsBox = makeElement('div', elt, {id:'settingsBox'})
  var generalTab = createGeneralTab()
  settingsBox.appendChild(generalTab)

  makeButton(settingsBox, 'left: 10px', 'Update', updateScript)
  makeButton(settingsBox, 'left: 104px', 'Help', helpSettings)
  makeButton(settingsBox, 'left: 181px', 'Cancel', closeSettings)
  makeButton(settingsBox, 'right: 10px', 'Show', saveSettings)
  
  var flatten = $j('#flattenHierarchy')
  if (siteSpec.flat)
    flatten.prop("disabled", true)
  else {
    enableCheckboxesBasedOn(flatten[0])
    flatten.click(enableCheckboxes)
  }
}

function enableCheckboxesBasedOn(flatten) {
  $j('#newestAtStart').prop("disabled", !flatten.checked)
  $j('#hideOld').prop("disabled", !flatten.checked)
}

function enableCheckboxes() {
  enable_checkboxes_based_on(this)
}

function makeButton(settingsBox, position, name, action) {
  var button = makeElement('span', settingsBox, {class:'fancy_button', style:position+'; bottom: 10px;'})
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
    {id:'generalTab', style:'width:320px;'}
  )
  var list = makeElement('div', generalTab,
    {style: 'position: relative; top: 10px; margin-left: auto; margin-right: auto; width: 98%; line-height: 125%;'}
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
  if (!siteSpec.flat) { // don't let Lucia flatten CA
    flattenHierarchy = $j('#flattenHierarchy')[0].checked
    GM_setValue('flattenHierarchy', flattenHierarchy)
  }
  GM_setValue('newestAtStart', newestAtStart = $j('#newestAtStart')[0].checked)
  GM_setValue('hideOld', hideOld = $j('#hideOld')[0].checked)

  closeSettings()

  location.reload()
}

////////////////////////////////////////////////////////////////////////////////
// Comment form
////////////////////////////////////////////////////////////////////////////////

var show_text = 'Preview'
var hide_text = 'Hide preview'
var textarea = $j('textarea[name="comment"]')
if (empty(textarea)) return // redundant given earlier test on commentParent?
var comment = ''

textarea.wrap('<div id="ca-cmt-wrap"></div>')
textarea.before('<div id="ca-cmt-preview"></div>')
$j('#ca-cmt-preview').prepend('<div id="preview-tab"><div><a>'+ show_text +'</a></div></div>')
var toggleState = true
$j('#preview-tab div').click(function() {
  if (toggleState) {
    comment = textarea.val()
    if (comment != '') comment = comment + '\n\n'
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
    .replace(/\s*\n\s*/g, '<br />')

    var preview_html = '<ol id="cmt-preview"><li>'+ comment_preview +'</li></ol>'

    textarea.after('<div id="textarea_clone"></div>')
    textarea.clone().appendTo($j('#textarea_clone'))
    $j('#textarea_clone textarea').text(comment)
    $j('#textarea_clone').hide()
    textarea.replaceWith('<div id="comment_preview"></div>')
    $j('#comment_preview').html(preview_html)
    $j('#preview-tab a').text(hide_text)
    $j('#html-editor button').hide()
  } else {
    $j('#textarea_clone').remove()
    $j('#comment_preview').replaceWith(textarea)
    textarea.text(comment)
    $j('#preview-tab a').text(show_text)
    $j('#html-editor button').show()
  }
  toggleState = !toggleState
})

var html_editor = '<div id="html-editor"><button style="display: block;" id="ed_strong" title="Bold">strong</button><button style="display: block;" id="ed_em" title="Italic">em</button><button style="display: block;" id="ed_link" title="Link">a[href=""]</button><button style="display: block;" id="ed_blockquote" title="Insert Quote">blockquote</button><button style="display: block;" title="Superscript" id="ed_sup">sup</button><button style="display: block;" title="Subscript" id="ed_sub">sub</button><button style="display: block;" title="Less-Than symbol" id="ed_lt">lt</button><button style="display: block;" title="Strikeout" id="ed_del">del</button><button style="display: block;" title="Underscore" id="ed_under">under</button><button style="display: block;" id="ed_code" title="Source Code">code</button><button style="display: block;" title="LaTeX code" id="ed_latex">latex</button><button style="display: block;" title="Insert Image"  id="ed_img">img[src=""]</button></div>'

$j('#ca-cmt-preview').prepend(html_editor)

function setSelect(element, iStart, iLength) {
  if (element.createTextRange) {
    var oRange = element.createTextRange()
    oRange.moveStart("character", iStart)
    oRange.moveEnd("character", iLength - element.value.length)
    oRange.select()
  } else if (element.setSelectionRange)
    element.setSelectionRange(iStart, iStart+iLength)
}

function insert(start, end, core) {
  element = document.getElementById('comment')
  if (document.selection) {
    element.focus()
    sel = document.selection.createRange()
    sel.text = start + sel.text + end
  } else if (element.selectionStart || element.selectionStart == '0') {
    element.focus()
    var startPos = element.selectionStart
    var endPos = element.selectionEnd
    if (startPos == endPos) {
      element.value = element.value.substring(0, startPos) + start + core + end + element.value.substring(endPos, element.value.length)
      setSelect(element, startPos+start.length, core.length)
    } else
      element.value = element.value.substring(0, startPos) + start + element.value.substring(startPos, endPos) + end + element.value.substring(endPos, element.value.length)
  } else {
    element.value += start + core + end
    setSelect(element, start.length, core.length)
  }
}
  
$j('#html-editor button').click(function() {
  var attribs = $j(this).text()
  var button_id = attribs.replace(/\[.*\]/, '')
  if (/\[.*\]/.test(attribs)) 
    attribs = attribs.replace(/.*\[(.*)\]/, ' $1')
  else
    attribs = ''
  var start = ''
  var end = ''
  var core = ''
  switch (button_id) {
  case 'lt':
    start = '&lt;'
    break
  case 'img':
    var URL = prompt('Enter the URL of the image', 'http://')
    if (URL) {
      start = '<img src="'
        + URL
        + '" alt="' + prompt('Enter a description of the image', '')
        + '" width="' + prompt('Enter image width (e.g. 400) or leave blank for natural size', '')
        + '" />'
    } else {
      start = '<img src="';end='" alt="" width="" />'
      core = 'URL_here_with_NO_spaces_at_all...Just_paste_over_this_message!'
    }
    break
  case 'latex':
    start = '$latex '
    end = ' $'
    core = 'LaTeX here. Leave blank at both ends!'
    break
  case 'code':
    start = '[sourcecode]'
    end = '[/sourcecode]'
    break
  case 'a':
    var URL = prompt('Enter the URL' ,'http://')
    if (URL) {
      start = '<a href="' + URL + '">'
      core = 'LinkText Here'
      end = "</a>"
    } else {
      start = '<a href="';end='">LinkText Here</a>'
      core = 'URL_here_with_NO_spaces_at_all...Just_paste_over_this_message!'
    }
    break
  default:
    start = '<'+button_id+attribs+'>'
    end = '</'+button_id+'>'
  }
  insert(start, end, core)
  return false
})

////////////////////////////////////////////////////////////////////////////////
// Utilities
////////////////////////////////////////////////////////////////////////////////

function empty(data) {
  if (typeof(data) == 'number' || typeof(data) == 'boolean') return false
  if (typeof(data) == 'undefined' || data === null) return true
  if (typeof(data.length) != 'undefined') return data.length == 0
  return false // all objects without length considered non-empty
}
