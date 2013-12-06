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
* 0.1 Use jQuery 2.0.3
* 0.0.9 Support new Lucia version.
* 0.0.8 All Open Science Blog Ring sites now should work. Comment reorder now optional. Many bugfixes.
*/

//
// Sites listed below are members of the new Open Source Webring
//

// ==UserScript==
// @name        ca-assist
// @namespace   ca-assist
// @description Enhances user experience on Open Science Web Ring courtesy of Climate Audit
// @copyright   2009+, MrPete (http://www.ClimateAudit.org) and friends All right reserved
// @license     GPL version 3 or any later version; http://www.gnu.org/copyleft/gpl.html
// @include     http://climateaudit.org/*
// @include     http://www.climateaudit.org/*
// @include     http://noconsensus.wordpress.com/*
// @include     http://statpad.wordpress.com/*
// @include     http://rankexploits.com/musings/*
// @include     http://wattsupwiththat.com/*
// @include     http://danhughes.auditblogs.com/*
// @include     http://dev.livestation.com/climfit/*
// @version     0.1
// @require     http://ajax.googleapis.com/ajax/libs/jquery/2.0.3/jquery.min.js
// @require     https://raw.github.com/rdrake98/ca-assist/master/ca-assist-comment.js
// ==/UserScript==
var $j = jQuery.noConflict();


var SCRIPT = { // URL of the script for updates
  url: 'https://github.com/rdrake98/ca-assist/raw/master/ca-assist.user.js',
  version: '0.1',
  build: '42',
  ajaxPage: 'inner2',
};

// Register debugOnOff, etc with Greasemonkey (for later)
GM_registerMenuCommand('CA Assistant - Clear Saved Values', function() { clearSettings(); loadHome(); });

function loadHome() {}

if (window.top != window.self) {	//don't run on frames or iframes
	return;
}
	

String.prototype.trim = function() {
  return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
}
String.prototype.ltrim = function() {
  return this.replace(/^\s\s*/, '');
}
String.prototype.rtrim = function() {
  return this.replace(/\s\s*$/, '');
}
String.prototype.untag = function() {
	//console.log('UNTAG:'+this);
  return this.replace(/<[^>]+>/g, '');
}

	
/* **************************************************
           Sort the comment tree
   ************************************************** */

var siteType='CA'
console.log('hostname: '+location.hostname)
switch(location.hostname) {
  case 'climateaudit.org': siteType='CA'; break;
  case 'wattsupwiththat.com': siteType='WUWT'; break;
  case 'dev.livestation.com': 
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
		'authElm':'.comment-author:first','itemElm': 'li.comment', 'dateText': '.comment-meta:first', 'bHasReply':true };
	case 'CE': cmtForm= { 'listID': '#comments-list ol','listElm':'#commentListOL li','hideElm':'',
		'threadElm':'#commentListOL > li','bSeqDate':0, 'topDiv':'#header','replyElm':'.comment-meta:first',
		'authElm':'.comment-author:first','itemElm': 'li.comment', 'dateText': '.comment-meta:first', 'bHasReply':true };
	case 'WUWT': cmtForm= { 'listID': 'dl.commentlist','listElm':'#commentListOL > div','hideElm':'',
		'threadElm':'#commentListOL > div','bSeqDate':1,'topDiv':'#header','replyElm':'span.commentmetadata',
		'authElm':'.comment-author:first','itemElm': 'dd.comment', 'dateText': 'span.commentmetadata', 'bHasReply':false };
};
	
function getCmtDate(txt) {
	// made a separate function. RegEx variables appear to cause Big Trouble.
	//[optional 'Posted ', then mm ddth, yyyy at hh:mm pm
  console.log('getCmtDate: '+txt)
	txt = txt.split('|',1)[0]; // remove any option stuff at the end...
  console.log(txt)
	var sRep='$1$3 $4';
	var res = txt.replace(/(?:Posted )?([A-Za-z]+ [0-9]+)([a-z]*)(, [0-9]+) at ([0-9]+:[0-9]+ (AM|PM))+/i, sRep).trim(); 
  console.log(res)
	return res;
}	

//
// ICON INITIALIZATIONS
//

//create data uris for mini icon usage

var redBgImage =    '<img src="' +
                    'data:image/gif;base64,' +
                    'R0lGODlhZAAyALMAACIODyUQESYTFCkWGCwZHTMgJDckKDAdIDooLT4sMUw6QEY0OkEvNVJBSFlIUGFQWSH5BAAAAAAALAAAAABkADIAQAT/sC3EWBNFJYDcOoiiEMbSFIWjHJaGII9RxgwrURamcR4okiaUyuYK' +
                    'jUqn1KqVeMVmNYbJ0FQMDonEwKBgFBAJxRexMGQUBikDYTaREI2BoEsILxbX7Lb7DY/LZ2kLCRlgYi+AIoJrBiEFd2ZkCAECBgcEcgQFVwgFJCgElwmYLwcFZgaahAShCAICCQYCpjKvmpyeZp6ipAi0p5+7db0H' +
                    'ja0yB7SYBwIAAQMDAACsAAKYr9YBlATbBALQ4M6Y1dfglNDS1NaZ39De3wTOB+AFzNzb3fDO6OuvA97OnDWrNlBAAGmUEBqsdlDbQYHSXgWk9DAhwYgPJw60+CqjRYoM/52B5PjQYMWSKKVVU1nwpEKWCDOKxEgz' +
                    'IsyQDp8dHLgSp0M5DYNqQ8iy4cKZF0dKPBgt6VGVRQW6dGq02c6SVhdSstpzqUMpGBoQKjHilANoHgiEKJOAgYJOCRw0aqAhwR25BNwyCFBA7KkFZQ2cHZB2LRW3cOVqKayALeICcefWvYOAhKVTNcZUNsXgm4Yt' +
                    'TU6lQcGlHpjKjxIUS2MKsqUXmwt0HvCZSicZXk4doq3FtujcXGSUOvBWLZ5vBQyy4vavACVP1i6xGrDpyqblxTDVu2Runjvmmp7Ho27vlvVvpryFWk5dDvT1clIFWI9wQNWITeXss/pMGrqt+p3jX/80OglUUFML' +
                    '6feNSd80BI1VAfYHwH8KQuPgTUiRJNVQBfHUElQZ8TQURDiZtNNLUm14IolamURUTy+O2GJDPYE0Y0Ai8hQQUjeuOBRFRtG4UZAYNmMcA/8MkYAEjYRRhwIN1KGCIGKs8UA9DsglBZQLHJnkCkuWYciTUcaFxpay' +
                    'wTBCGGVOiaaVWGrJZTENvJCFGJApYI1YT04wQZRpLCECG2GIEWgAcMgFhh957jmKHZIA6hYLCzjwaGORkjCpW2+98FYbnbwVCwHFhdDJF3gccMcjfNi1AGQZaAHZAp5VRgYDMhSi1lsokHHFqoB54Wqadv36arCz' +
                    'vkrIEm21ooX/KQl8w0Zl1CXwzKiNyGAJcKOk+RquyTRiTRZYRKKdtQNgywYy3GriRSrZskvaKFRcQsZrbLBiSSjJzFePHNS9YoY1qWByi71bbALCN5ZckQw0lvg7D3ICJ0fCdAerJUclFhfcXDUyBGBKMZnMo4kt' +
                    'rGwTzSyZYByKcvZ4go47r3jyzCXwcLNONfOIFx3GzmlyDXusMDOfN//YckA6/+j0jTgGLRh1fvbNB/CDBvVMjkHmPEOgN+d0ZPXTXpNzdTYDalMOUGz/Y98sHemHokRO8YdgVnS7WCBILLZkIjYi3b2UV3enqI3d' +
                    'KoU4VVcfznQ4iiMmXlPkBb0EZED2RdQ4/+Wa17SjQzHZJFJQG5VO0+OQjyhjTKRbrvePH+GN+kc8BgVi6CUSWXuGp8s0lVac4w58iJrndFXqk4vY+eEOKY8U8iGRuKNXHjlP/U0WAaBFB7G41SULDsyS1pJoZOEA' +
                    'nWXStYAUDXhBglgDcB/o9wyEf8D4dFERF/p1NIB/+fszQAPS1xj2MeB9FqgBFeJAALpcQQKoQsMLGmCKAUKGLmgQjGke4IDKJLAYS/qHAw8AQTJIEA4VPAH5DgGYRqCwLyrEoAwcYBo+qUY2KyChFQSIK9kAKi6E' +
                    '6AGnYHMCUg3BAA+gYCoAkwwH8tAMFiABEFPwgSGyIYpUsBQVWTCoCf+iQAF44RRr+oKkELgvA6EQgQ+aQAW2CEYGUCqLBIrhlly0L3580MQIiLOCELDRLraxVBr76II2UuGNAhTVq8yABeJ0wk5StAJxVEOGLMQi' +
                    'g4CJ4BHaZ4ZifeEtIABDJK+gARAMIgvBIQudSllJVGKShYPoS2WC4yssUCAUayAlvnDFALtcwi1P0kNqPPGIf6zPXc1iAQJ0GUpe+jIva8pgM9PwTGCGgVxiCGW3rPEqFKTLFbKxBLS0Q7/bZEsDE9CErwiQzkNW' +
                    'JgBNwAC4xkmdcoqGDXWCDDlxaU42GAo2BywXIS4BAu34YhfL3MIy61APbdUjL5jI1j/chwoQyGb/E19IDwggttCBOvSXmFDoPzyKDNOcAgzfiOdDTyYyA0DDFCBjRjGISQJrnOIKjNxMJwjq0lm4NBTVgWklZGoG' +
                    'oclCEy6dKVFpetSbngIUDKXOZZwhs24841+suE4ooOHNZEjHZMnQlxxMcTTnWIM5WL1FVrmqsLD+Q61bpc51TMHVoplnGdcQmX2ucLWlzUKm73kYUHrWnre+AxPaIOzE/uHXl1nnZiYjD88Aq55QaCNpDrOqRPrh' +
                    'tnPEAwCXmNDaypEcro12HysrB2L1cdbLIk1mL31aaN3WDvVEg7aJbcY/zHaOzFmDaV4DhzX8AZ5wLEhte+1ZO3YSj/nYIrVA/xnuM0Ia3Ae940EWgsdBrnFcfygkbFKjCDcmdLbMbWU/wQXQdxcEFPXqY2x77Yhy' +
                    'mHK1y0qNQimaEN5cR6AAEa4i5iXbiPx7lI0V7hkmQrBA+rvfyy5PQVGRHoJSMru7Ne8oMqoITxD0YAwTKHrA8xBTdLcTHf2OSD66z/NgZGLhnc5FjgPdSGo0pNHBpHrC07Dk6pY8qGC4xtFLCOWEouMXLQUisYtR' +
                    'VPgmo6yo+McigbHi8ttkwx05c1QxUH1Cx7clB294NznK9aDiZeL5xMzZA7PohOzkHWPYzMPjEO5gt7rELe5DxqPxhkYnZyQnWHU+sZ5QwvwhGNfII9mj8FOX+UNnQvNZRfwx8p07F+Q65+12EV705ITEks1xOimR' +
                    'E12G8GwiPU8oSD/ysZ3nhmofla7Vps4J74b0O9ZF2XU5+duqbcwjW8/OyYP+9Z5BLI0IAAA7' +
                    '" />';

var isNew = 8;     // a "new" comment is less than 8 hours ago
var isOld = 24;			// an "old" comment is more than 48 hours (values are NOT the official defaults; just set her temporarily)
var bShowThreads = 1; // default: do show threads
var bRecentLast = 1; // default: show in oldest-to-recent order
var bEnableOrder= 1; // default: do reorder comments
var bHideOld = 1;		// default: do hide old comments
var bColorAge = 1;		// default: do color comments by age
var bReorgRcntCmt = 1; // default: reorganize recent comments widget

// 
// INIT
//

if (!initialized) {
  var settingsOpen = false;
  var debug = isChecked('enableDebug');
  if (GM_getValue('version') != SCRIPT.version ||
      GM_getValue('build') != SCRIPT.build) {
    handleVersionChange();
  }

// Check for missing settings.
  if (GM_getValue('isOld') == undefined) {
    saveDefaultSettings();
    addToLog('info Icon', 'If you want to customize your view, please adjust your settings.');
  }
	refreshSettings();

  var initialized = true;
  DEBUG('Completed initialize.');
} else {
  alert('ALREADY INIT -- tell MrPete!');
}

customizeMasthead();


/////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////
// MISC FIXUPS ON ***ALL*** PAGES
/////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////

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
/////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////
// AFTER THIS: functions ONLY on comment pages
/////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////
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
//	console.log('test:'+(cmtDates[elm.id]));
//	console.log('diffn:'+(cmtDates[elm.id] - cmtOldAge));
//	console.log('diffb:'+(cmtDates[elm.id] >= cmtOldAge));
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
// WUWT wrap-pairs
// Each comment is a pair of <dt><dd> elements. Wrap them in a div
//
function setWUWTpairs() {
	
	//var div = $j(cmtForm.listID).get (0);
	
	//console.log('get all dt in: '+cmtForm.listID);
	$j("dt",cmtForm.listID).each(function(){
		var sDate=$j(this).text();
		//console.log('raw date:'+sDate);
		sDate=sDate.replace(/(\d+)[\s\c]*(\d+)[\s\c]*(\d+)/,'$2/$1/$3').trim();
		var dd=$j(this).next().get(0);
//		console.log('dd type:'+dd.nodeName);
		var sTime=$j('span.comment-meta > small',dd).text().replace(/[()]/g,'');
		var sID = dd.id;
		var wrapID='caa'+sID;
		var cmtURL='#'+sID;
	//	console.log('new date time:'+sDate+' '+sTime);
	//	console.log('id:'+sID);
		$j(this).add(dd).wrapAll('<div id="'+wrapID+'" class="caaWrap"></div>');
	//	console.log('wrapped');
		var elm=$j('#'+wrapID).get(0);
		var cmtDate=new Date(sDate+' '+sTime);
//		console.log(elm.nodeName);
		cmtDates[wrapID]=cmtDate.valueOf();
		if (isNaN(cmtDates[wrapID])) {
			DEBUG('NaN: "'+cmtDateStr+'"');
		}
		$j(cmtForm.replyElm,elm).append('<span class="meta-sep"> | </span><a class="comment-paste-link" title="'+sReplyTxt+'" href="'+cmtURL+'">'+sReplyTxt+'</a>');
		if (bHideOld || bColorAge) AgeComment(elm);
	});
}


//
// ADD REPLY LINKS
//
var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function setReplyLink(elm) {
	var cmtURL='#'+elm.id;
	var cmtDateStr = getCmtDate($j(cmtForm.dateText,elm).text());
	
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
	switch(siteType) {
		case 'WUWT':	cmtElm=$j(cmtElm).parent(); // two extra for WUWT
		case 'Lucia': cmtElm=$j(cmtElm).parent(); // one extra
		default:
			cmtElm=$j(cmtElm).parent(); // up one
		}
	if (siteType=='WUWT') {
		var cmtURL='#'+$j('dd',cmtElm).attr('id');
	} else {
		var cmtURL='#'+cmtElm.attr('id');
	}
	var cmtAuth = $j(cmtForm.authElm,cmtElm).text().trim();
	if (siteType=='WUWT') {
		var sDate=$j('dt',cmtElm).text();
		sDate=sDate.replace(/(\d+)[\s\c]*(\d+)[\s\c]*(\d+)/,'$2/$1/$3').trim();
		var sTime=$j('dd span.comment-meta > small',cmtElm).text().replace(/[()]/g,'');
		var cmtDateStr = sDate+' '+sTime;
	} else {
		var cmtDateStr = getCmtDate($j(cmtForm.dateText,cmtElm).text());
	}
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
	
	//IE support
	if (document.selection) {
		myField.focus();
		sel = document.selection.createRange();
		sel.text = myValue;
		myField.focus();
	}
	//MOZILLA/NETSCAPE support
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
  setReplyLink(this); // only need to do this one time
  if (bHideOld || bColorAge) AgeComment(this);
}


function setupComments() {
  console.log(cmtForm.listElm)
  console.log($j(cmtForm.listElm).length)
	setAgeValues();
	if (siteType=='WUWT') {
		setWUWTpairs();
	} else {
		DEBUG('cmt setup');
		//$j(cmtForm.listID).css("display","none"); // hide them all for a bit
		//DEBUG('Comments hidden');
		$j(cmtForm.listElm).each(FixComment);
		DEBUG('Comments enhanced');
	}	
	
	
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
  var wpaTitle = 'CA-Assist ['+siteType+'] ' + SCRIPT.version + ' (Build ' + SCRIPT.build + ')';
  
  $j(cmtForm.topDiv).append(
    '<div id="wpa_menu" style="position: absolute; top: 30px; right: 25px; text-align: left; font-size: 11px; font-weight: bold; color: #FFD927">'+
    '<span id="wpa_settings">'+wpaTitle+'</span></div>');

	$j('span#wpa_settings').click(toggleSettingsBox);

}

// ********************************************************************
// ********************************************************************
// DEBUG AND LOG BOX
// ********************************************************************
// ********************************************************************


function DEBUG(line, level) {
  var level = (level == null) ? 0 : level;
}
  
function showIfUnchecked(setting) {
  if (setting == '0') {
    setting = 'unchecked';
  }
  return setting;
}

function showIfSelected(setting) {
  if (setting == '0') {
    setting = 'not selected';
  } else {
    setting = 'selected';
  }
  return setting;
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

function toggleSettingsBox() {
  if (settingsOpen === false) {
    settingsOpen = true;
    createSettingsBox();
    showSettingsBox();
  } else {
    settingsOpen = false;
    destroySettingsBox();

  }
}

function showSettingsBox() {
  var settingsBoxContainer = document.getElementById('wpa_settingsBox');
  if (settingsBoxContainer) {
    settingsBoxContainer.style.display = 'block';
  }
}

function destroySettingsBox() {
  var settingsBoxContainer = document.getElementById('wpa_settingsBox');
  if (settingsBoxContainer) {
    settingsBoxContainer.parentNode.removeChild(settingsBoxContainer);
  }
}

function createSettingsBox() {
  console.log("createSettingsBox");

  if (!document.getElementById('wpa_settings_css')) {
    makeElement('style', document.getElementsByTagName('head')[0], {'id':'wpa_settings_css', 'type':'text/css'}).appendChild(document.createTextNode(
      '#settingsBox .fancy_button{position:absolute;background-image:url(' + stripURI(redBgImage) + ');border:1px solid #FFD927;color:#FFD927;cursor:pointer;display:block;float:left;font-size:14px;font-weight:700;padding:5px;text-decoration:none;width:auto}' +
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

  // Create General tab.
  var generalTab = createGeneralTab();
  settingsBox.appendChild(generalTab);

  // Create Save button
  var saveButton = makeElement('span', settingsBox, {'class':'fancy_button', 'style':'left: 10px; bottom: 10px;'});
  makeElement('button', saveButton).appendChild(document.createTextNode('Save Settings'));
  saveButton.addEventListener('click', saveSettings, false);

  // Create Help button
  var helpButton = makeElement('span', settingsBox, {'class':'fancy_button', 'style':'left: 160px; bottom: 10px;'});
  makeElement('button', helpButton).appendChild(document.createTextNode('Help'));
  helpButton.addEventListener('click', helpSettings, false);

  // Create Update button
  var updateButton = makeElement('span', settingsBox, {'class':'fancy_button', 'style':'right: 10px; bottom: 10px;'});
  makeElement('button', updateButton).appendChild(document.createTextNode('Check for Updates'));
  updateButton.addEventListener('click', updateScript, false);

  DEBUG('Menu created.');
}

// Create General Tab
function createGeneralTab() {
  var title, id, label;
  var generalTab = makeElement('div', null, {'id':'generalTab', 'class':'tabcontent', 'style':'width:380px;background: #003;'});

  // Container for a list of settings.
  var list = makeElement('div', generalTab, {'style':'position: relative; top: 10px; margin-left: auto; margin-right: auto; width: 98%; line-height:125%;'});

  // Site Fixup options
  var sFixups = ''+
'<div><b>Site-Wide</b><br/>\n'+
'	<div class="lhs">\n'+
'		<label for="bReorgRcntCmt" title="Check this to reorganize the Recent Comments sidebar.">Neater Recent Comments:</label>\n'+
'	</div>\n'+
'	<div class="rhs">\n'+
'		<input id="bReorgRcntCmt" type="checkbox" title="Check this to reorganize the Recent Comments sidebar." style="vertical-align: middle;" value="checked"'+
((GM_getValue("bReorgRcntCmt",'checked')=='checked') ? ' checked="checked"' : '')+'/>\n'+
' </div>\n'+
'</div>\n'+
'<br class="caaHide"/>\n'+
'<br class="caaHide"/>\n';
  
  $j(list).append(sFixups);

  // New/old comment timing
  var sNewOld=''+
'<div><b>Comment Age</b><br/>\n'+
'	<div class="lhs">\n'+
'		<label for="isNew" title="Comment ages for coloring and hiding.">Define comment ages:</label>\n'+
'	</div>\n'+
'	<div class="rhs">\n'+
'		<input id="isNew" type="text" value="'+GM_getValue('isNew', '24')+'" size="1" style="vertical-align: middle; text-align: center;"/>\n'+
'		<label for="bHideOld"> (new) to </label><br/>\n'+
'		<input id="isOld" type="text" value="'+GM_getValue('isOld', '72')+'" size="1" style="vertical-align: middle; text-align: center;"/>\n'+
'		<label for="bHideOld"> (old) hours.</label>\n'+
'	</div>\n'+
'</div>\n'+
'<br class="caaHide"/>\n'+
'<div>\n'+
'	<div class="lhs">\n'+
'		<label for="bColorAge" title="Check to color newer comments according to indicated time intervals.">Color new comments:</label>\n'+
'	</div>\n'+
'	<div class="rhs">\n'+
'		<input id="bColorAge" type="checkbox" title="Check to color newer comments according to indicated time intervals." style="vertical-align: middle;" value="checked"' + ( (GM_getValue("bColorAge",'checked')=='checked') ? ' checked="checked"' : '') + '/>\n'+
'	</div>\n'+
'</div>\n'+
'<br class="caaHide"/>\n'+
'<div>\n'+
'	<div class="lhs">\n'+
'		<label for="bHideOld" title="Check to hide older comments."> Hide old comments:</label>\n'+
'	</div>\n'+
'	<div class="rhs">\n'+
'		<input id="bHideOld" type="checkbox" title="Check to hide older comments." style="vertical-align: middle;" value="checked"' +( (GM_getValue("bHideOld",'checked')=='checked') ? ' checked="checked"' : '')+'/>\n'+
'	</div>\n'+
'</div>\n'+
'<br class="caaHide"/>\n'+
'';

  $j(list).append(sNewOld);

  // Comment threading
var sThreadDisplay = ''+
'<br/><div><b>Comment Order</b><br/>\n'+
'(On largest pages, can take a few seconds)<br/>\n'+
'<div>\n'+
'	<div class="lhs">\n'+
'		<label for="bEnableOrder" title="Check to enable comment reordering">Enable reordering:</label>\n'+
'	</div>\n'+
'	<div class="rhs">\n'+
'		<input id="bEnableOrder" type="checkbox" style="vertical-align: middle;" title="Check to enable comment reordering" value="checked"' +( (GM_getValue("bEnableOrder",'checked')=='checked') ? ' checked="checked"' : '')+'/>\n'+
'	</div>\n'+
'<br class="caaHide"/>\n'+
'</div>\n'+
'	<div class="lhs">\n'+
'		<label for="bShowThreads" title="Use threaded display for comments (if site supports it)"> Threaded display:</label>\n'+
'	</div>\n'+
'	<div class="rhs">\n'+
'		<input id="bShowThreads" type="checkbox" style="vertical-align: middle;" value="checked"' +( (GM_getValue("bShowThreads",'checked')=='checked') ? ' checked="checked"' : '')+'/>\n'+
'		<label title="Use threaded display for comments (if site supports it)"> (if site supports it)</label>\n'+
'	</div>\n'+
'</div>\n'+
'<br class="caaHide"/>\n'+
'<div>\n'+
'	<div class="lhs">\n'+
'		<label for="bRecentLast" title="Check to show most-recent comments at the end">Newest at end:</label>\n'+
'	</div>\n'+
'	<div class="rhs">\n'+
'		<input id="bRecentLast" type="checkbox" style="vertical-align: middle;" title="Check to show most-recent comments at the end" value="checked"' +( (GM_getValue("bRecentLast",'checked')=='checked') ? ' checked="checked"' : '')+'/>\n'+
'	</div>\n'+
'<br class="caaHide"/>\n'+
'</div>\n'+
'';

  $j(list).append(sThreadDisplay);

  return generalTab;
}


function handleVersionChange() {
  addToLog('updateGood Icon', 'Now running version ' + SCRIPT.version + ' build ' + SCRIPT.build);
  GM_setValue('version', SCRIPT.version);
  GM_setValue('build', SCRIPT.build);
  // Check for invalid settings and upgrade them.
}

function saveDefaultSettings() {
  // Assume all settings have been cleared and set defaults.
  // For groups of radio buttons, one must be checked and all others cleared.
  // For checkboxes, no need to default if the option should be off.

  // General tab.

	GM_setValue('isNew', '8');
	GM_setValue('isOld', '24');
	GM_setValue("bColorAge",'checked');
	GM_setValue("bHideOld",'checked');
	GM_setValue("bShowThreads",'checked');
	GM_setValue("bRecentLast",'checked');
	GM_setValue("bEnableOrder",'checked');
	GM_setValue("bReorgRcntCmt",'checked');

}

function helpSettings() {
  window.open('http://climateaudit.org/ca-assistant/');
}

function saveSettings() {
	
	bColorAge      = (document.getElementById('bColorAge').checked === true);
	bHideOld      = (document.getElementById('bHideOld').checked === true);
	bShowThreads      = (document.getElementById('bShowThreads').checked === true);
  bRecentLast  = (document.getElementById('bRecentLast').checked === true);
  bEnableOrder  = (document.getElementById('bEnableOrder').checked === true);
  bReorgRcntCmt = (document.getElementById('bReorgRcntCmt').checked === true);
  isNew      = document.getElementById('isNew').value;
  isOld      = document.getElementById('isOld').value;

  GM_setValue ('isNew', isNew);
  GM_setValue ('isOld', isOld);
	saveCheckBoxElementArray(['bColorAge','bHideOld','bShowThreads','bRecentLast','bEnableOrder','bReorgRcntCmt']);

  toggleSettingsBox();
}

function refreshSettings() {
	bColorAge    = GM_getValue('bColorAge','checked');
	bHideOld     = GM_getValue('bHideOld','checked');
	bShowThreads = GM_getValue('bShowThreads','checked');
  bRecentLast  = GM_getValue('bRecentLast','checked');
  bEnableOrder  = GM_getValue('bEnableOrder','checked');
  bReorgRcntCmt = GM_getValue('bReorgRcntCmt','checked');
  isNew      = GM_getValue('isNew',8);
  isOld      = GM_getValue('isOld',48);
}

//update the script (by Richard Gibson; changed by ms99 and blannie)
function updateScript() {
  try {
    if (!GM_getValue) {
      return; // Only do this inside GM
    }
    GM_xmlhttpRequest({
      method: 'GET',
      url: SCRIPT.url + '?source', // don't increase the 'installed' count; just for checking
      onload: function(result) {
        if (result.status != 200) {
          return;
        }
        if (!result.responseText.match(/build:\s+'(\d+)/)) return;
        var theOtherBuild = parseInt(RegExp.$1);
        var runningBuild = parseInt(SCRIPT.build);
        var theOtherVersion = result.responseText.match(/@version\s+([\d.]+)/)? RegExp.$1 : '';
        if (theOtherBuild < runningBuild) {
          if (window.confirm('You have a beta version (build ' + runningBuild + ') installed.\n\nDo you want to DOWNGRADE to the most recent official release (version ' + theOtherVersion + ')?\n')) {
            //clearSettings();
            window.location.href = SCRIPT.url;
          }
          return;
        } else if (theOtherBuild > runningBuild ||
                   theOtherVersion != SCRIPT.version) {
          if (window.confirm('Version ' + theOtherVersion + ' is available!\n\n' + 'Do you want to upgrade?' + '\n')) {
            //clearSettings();
            window.location.href = SCRIPT.url;
          }
        } else {
          alert('You already have the latest version.');
          return;
        }
      }
    });
  } catch (ex) {
    addToLog('warning Icon', ex);
  }
}



function makeElement(type, appendto, attributes, checked, chkdefault) {
  var element = document.createElement(type);
  if (attributes != null) {
    for (var i in attributes) {
      element.setAttribute(i, attributes[i]);
    }
  }
  if (checked != null) {
    if (GM_getValue(checked, chkdefault) == 'checked') {
      element.setAttribute('checked', 'checked');
    }
  }
  if (appendto) {
    appendto.appendChild(element);
  }
  return element;
}


// Toggle checkbox element and return true if it is checked
function toggleCheckElt(eltId) {
  if (isChecked(eltId)) {
    GM_setValue(eltId, '0');
    return false;
  } else {
    GM_setValue(eltId, 'checked');
    return true;
  }
}

// Save an array of checkbox elements
function saveCheckBoxElementArray(arrayEltIds) {
  for (var i=0; i<arrayEltIds.length; i++)
    saveCheckBoxElement(arrayEltIds[i])
}

// Save checkbox element and return true if it is checked
function saveCheckBoxElement(eltId) {
  if (document.getElementById(eltId).checked === true) {
    GM_setValue(eltId, 'checked');
    return true;
  } else {
    GM_setValue(eltId, 0);
    return false;
  }
}

// Check if a GM value is the same as the passed value
function isSame (gmName, gmValue) {
  return GM_getValue(gmName) == gmValue;
}

// Check if a GM value is checked or not
function isChecked (gmName) {
  return isSame (gmName, 'checked');
}

function clearSettings() {
  if (typeof GM_listValues == 'function' &&
      typeof GM_deleteValue == 'function') {
    var values = GM_listValues();
    for (var i in values) {
      GM_deleteValue(values[i]);
    }
  } else {
    alert('In order to do this you need at least GreaseMonkey version: 0.8.20090123.1. Please upgrade and try again.');
  }
}
