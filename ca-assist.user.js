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
GM_registerMenuCommand('CA Assistant - Turn Debugging Log On/Off', debugOnOff);
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

//
// Detect which website style we're assisting
//
var siteType='CA'; // assume CA
//console.log('Testing site type');
//console.log('host:'+location.hostname);
var bFound=true;
switch(location.hostname) {
	case 'climateaudit.org':       siteType='CA';break;
	case 'statpad.wordpress.com':  siteType='RomanM';break;
	case 'wattsupwiththat.com':    siteType='WUWT';break;
	case 'localhost':
	case 'rankexploits.com':       siteType='Lucia';break;
	case 'danhughes.auditblogs.com': siteType='DanH';break;
	case 'noconsensus.wordpress.com':  siteType='JeffId';break;
  default: // this only really works on a comment page...
  	bFound=false;
		if ($j('#comments-list').length) {
			// CA, RomanM
			if ($j('#comments-list > ul:first').length) {
					siteType='RomanM'; // UL instead of OL
			}
		} else if ($j('ol.commentlist').length)  {
			// DanH, JeffId
			if ($j('ol.commentlist > li.comment:first').length) {
				siteType='JeffId';
			} else {
				siteType='DanH'; // comment LI has no consistent class
			}
		} else if ($j('#content > span.KonaFilter').length) {
				siteType='Lucia';
		} else if ($j('dl.commentlist').length) {
				siteType='WUWT';
		}
}

DEBUG('Site type: '+siteType+(bFound? '*' : ''));

//listID   where to find the comment list
//bSeqDate True if date element precedes each comment element (WUWT)
//dtRegEx string for finding date/time--convert to regex
//dtRegRep string for date/time result
//itemElm  how to find each comment in the list
//dateText how to find date text, given we're pointing to the comment (or preceding item)
//replyElm on which element to attach the Paste Reply link
//bHasReply true if there's a reply link on each comment (otw, Paste Link will say "Re:")


switch (siteType) {
	case 'RomanM': var cmtForm= { 'listID': 'ul.comment_list', 'listElm':'#commentListOL li','hideElm':'div.entry',
		'threadElm':'#commentListOL > li','bSeqDate':0,'topDiv':'#container','replyElm':'div.reply:first',
		'authElm':'span.comment_author:first','itemElm': 'li.comment', 'dateText': '.comment-meta:first', 'bHasReply':true };break;
	case 'JeffId': var cmtForm= { 'listID': 'ol.commentlist', 'listElm':'#commentListOL li','hideElm':'',
		'threadElm':'#commentListOL > li','bSeqDate':0,'topDiv':'#sitename','replyElm':'.comment-meta',
		'authElm':'.comment-author cite','itemElm': 'li.comment', 'dateText': '.comment-meta', 'bHasReply':false };break;
	case 'DanH':   var cmtForm= { 'listID': 'ol.commentlist', 'listElm':'#commentListOL li','hideElm':'',
		'threadElm':'#commentListOL > li','bSeqDate':0,'topDiv':'#header','replyElm':'.commentmetadata',
		'authElm':'cite > a.url','itemElm': 'li', 'dateText': '.commentmetadata', 'bHasReply':false };break;
	case 'Lucia':  var cmtForm= { 'listID': 'div.commentlist', 'listElm':'div.comment','hideElm':'div.comment-text',
		'threadElm':'div.comment','bSeqDate':0,'topDiv':'#bodyinner','replyElm':'.commentmetadata',
		'authElm':'.comment-author','itemElm': 'div.comment', 'dateText': '.comment-date', 'bHasReply':false };break;
	case 'WUWT':   var cmtForm= { 'listID': 'dl.commentlist','listElm':'#commentListOL > div','hideElm':'',
		'threadElm':'#commentListOL > div','bSeqDate':1,'topDiv':'#header','replyElm':'span.commentmetadata',
		'authElm':'.comment-author:first','itemElm': 'dd.comment', 'dateText': 'span.commentmetadata', 'bHasReply':false };break;
	default:
	case 'CA': var cmtForm=    { 'listID': '#comments-list ol','listElm':'#commentListOL li','hideElm':'',
		'threadElm':'#commentListOL > li','bSeqDate':0, 'topDiv':'#header','replyElm':'.comment-meta:first',
		'authElm':'.comment-author:first','itemElm': 'li.comment', 'dateText': '.comment-meta:first', 'bHasReply':true };break;
	};
	
function getCmtDate(txt,bTest) {
	// made a separate function. RegEx variables appear to cause Big Trouble.
	//[optional 'Posted ', then mm ddth, yyyy at hh:mm pm
	txt = txt.split('|',1)[0]; // remove any option stuff at the end...
	var sRep='$1$3 $4';
	var res = txt.replace(/(?:Posted )?([A-Za-z]+ [0-9]+)([a-z]*)(, [0-9]+) at ([0-9]+:[0-9]+ (AM|PM))+/i, sRep).trim(); 
	return res;
}	

//
// ICON INITIALIZATIONS
//

//create data uris for mini icon usage
var tabSelectedImage = '<img src="' +
                    'data:image/gif;base64,R0lGODdhZAAyAOMQACIODyUQESYTFCkWGCwZHTMgJDckKDAdIDooLT4sMUw6QEY0OkEvNVJBSFlIUGFQWSwAAAAAZAAyAAAE/hAAIQMFwYa5+c6fxklChplT1YGq5GlgOXpnd6FsCm' +
                    '7CRfEyUa/ymwRlwxPxc3G5hJcBxsgEtjDHZ6W1I9lqR9s3xvReU1oyRjr7ZbIzFNopm7OSnVnNuDVjr3VXeSVvJngudRaAKzeGPlM4Pk1FkSSPgk1TiJYkKoycdp+ac00iKJRBpmNYZUqjeqhlIjqsf655aIZqXU' +
                    'mlJryXe4qjhE9fKj+SnZ62g79uMcEsw3K+rThOz33at2HNK9nX4DVqddC/QmNdw75nudMr6tPSoutMA+vBP/jzy3Y3jcL5SyRq0hOAgvKka2OsFUNm7BracsIMD71W1iZqMvcGiZgQ/iE8egG5DMcpZxjFjNzzjp' +
                    'kmVRLwWarCZ82UHjTxMHIYr1giSTkD1hr2ElnKTrs4Ii1ki+CmPkQGPkrqp5qWNjw+1HTmiWfWqK5+0imI5Aaieiq3KQsFFo+UkF/RtGtG8eTKSjXnEj0mLG0scrdMXcL2dE7YVEiHCsU1hJqPKrKUEnlsRuHan1' +
                    'p7xYuclh1lrUPfTuKmaINMLDJ7xTwLNhIhC1E+NovCemLsrEFjOgKShJ+R1yUu71wT0lJZ3UCs5B0kRUDq21QmyByAhN+b5zF7sIHNY7sJ6h9OB/CNU7ppkdGdLwEgczx18+zZkE89oD14C+/VD3sffbxp+dWV/l' +
                    'cfcvCpxx5QxOkWn3bOZVCfc28RoIF24zknIQAEvEcdIc51OMuG7uHTYH/UPThgABIG16GHdYDYYA8HlDBAhiLWWKKE7lVAAIQWUlDfeTN2BJ4AF/4YogU7rnEAbPXd6CCATAZXpIozYpChjCVuuGOTP9aXIZLBze' +
                    'jjjkRukKR7Mh6AT5D4+eglPlcSCWGT4xEgwZkP1kkBkRuKGZ+Z1BGwI4qE7HhAAU0uiaGWTcrpp6Axgdeon0HG16igJQxKqHZJQvrnBBlOsCR+oYpJo4VSEHDAgWp6iSifGWC6qIxXUirTqTOKKMCrud6Y6qqz1n' +
                    'njng1maCcAB5B5paAW/iRrLKYzFiChtDOquiMBBaQ5ZqbLqolitnxK4aqhKTpb7ZYxsjeooGRKi+KgB6gJawDOEllAjPFScGiu8eJzL3XJ6lurtwOMKiaRgtaH6HhLQhjvtfcKkC+yJhLc8IxqWouiARYGjK1ziL' +
                    'Lr8b+7tiqtoYhimG0A1L6baIiq7kuAAc5m+O8AIQs6cgkts2sBrzRK6yyiOCeLM9HmnoxxvwUQrbTS+77LM7MRD2CAzkY7G6+aTdeXdMJRY1pnARsgGrDVhy5pAMcAUCvo1bty7BwCquL8LNwFyM3roRIeYIDX/f' +
                    'pNHQJc/00313fvmHcPe7u7tapX+41oAQkI2rQB/ohivuPV0uaNr+dWSysA59jSLDHbN9+boeloq1oA4QQQDrrmo2NbOr6ot0rzz1jPiHm8a8OOAM0IIDBj5clePnPe9xZ/vLXKv454D2tHbEACPcCObQLSYv678w' +
                    'Qgj23e2BJud8ccB4BAtggkQF0Cw0t/79o0U57h8F4y4Dr9h1Y+AP7/S94B1oczBkjPe9jSn9XwRwD9HYp/9vvf3wKIrQGGDHb9m1nx/LaAwyXgah9sGgP8FryrYc6A4cNcAUZIv+HNzH0B4N6M1ne9AySgcgIYHv' +
                    'AYQDgDIACFIVwhCX1oQhjKMHY+fN/8EpAsHhYPcwogIuZ+mKwFhIx7CGiA/hRfN0ICWPF49/KbAXOYABQN74OxW0CGOigtBCwgAVEc3hS7+MXwhdEAY2zf0QqgRgF0MHYKiNcTDRBFEVavfX+D4/8KUMgVHvKDA1' +
                    'CkAAyYrOL1kHv3YsDabGjF2MHvUI3U5BQhKUlKxq54mfyd5uAnu0DeUAGVU4AD36hJJ5IQlgSQpapoiccNElJNVGxgAlDIADUOoJOU++IrYznLYfayh4H8Xxd5yMRjGu+TwhyhAijHxzeuUAFWXMAC1PTGH3aTew' +
                    'wAZzfJub7XKYBuCNjm2ooJTwVQx5uR3Cb3xIlOdYqTnU2LZz1fGM+8RTF2DUgmG8G5tijeMAEdtKEC/rR4AIYS8no3jCgc1QRLEG5QoIjyJh61mEtwrs+iDs0o4TY6gI6GD5XxtOEB2GgAcTJyeD9cgCYVIM8Onh' +
                    'R++tQpIXuKSliuL52JrKY4cZlO5zTAhQ2wog+LuVOi/vSoUYxkNd/5wagyr5wTXZsDrlfTD7bvnRUNZPgcgMg3+hCOhONpsraZwHcOgAEkZaQmZ5rQXDYgigYY6wfdeta4qpWu3zQeXlP5TqkKtHg81aYmCfDUDi' +
                    '4AlwlwgE4rOtnKuhGzDdgRLJsGS/gF9qkBkCUUOxpPWXL2ap69bOUSEFoBjJaRNyweRXUZ2G0W4KmQde0CHEA5B6CxAZoM7giH/lvc4xpwpH+baLzAObMDNOABNFOAAxSALeC2drnEzaxz84bX6DZgupREoxvfCM' +
                    'enBhaLshzsO73ogEi+150MkC/dhlufsUqLoZRLaADSqb/A8rO9wzMufvVL3/5qDsC0zZZOw/fUQ411qA3gXgMSat0nmpSRE9Uwh4FLSDYu4LwtDe0AMkwzvOoPAQ54gOwuzNMM/3bEHjYxiieaIRYfwMUnVq0DHH' +
                    'AoGRsQnDs1LmVxqQAjM1Ko2q3cX2Np2hMzUbsZoqcX/yrUIRfZnEgmpJKnnMsqZ7iiDsjyH0mKV51eNsOUpahxPxhi+sJ5wzSbMyHhPNwYOYCOqs3sNfPaVeZi1hnPB9BznfssgD9XMdBsjeQIGfCABaxNxmdFLp' +
                    'qbFtWr8bR47dUmcX9r6ZISbrgIAAAcs4VcHp540gao9KVBPVFRc7rUn54pW1W9TQG02o0NiAAAOw==' +
                    '" />';

var infoIcon = '<img src="' +
                    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAADPUlEQVR42l3Te2wMQRwH8O++aTV1WjmttueupSIedWiaqJL7QyQETdoQJyIIEsQrErlS0Wg9KooQkYq/LogSCeKt8Q' +
                    'wSjcQj+INzrfbu2nu0d1drd293ze4FZZJNdnZmPzO/38yPwn/N5/PbOY5dJwiCS9N1u64DFHSfKIrtsqycmzChxDd0PvX7xe/3MzTNNiRF7PK2dXDPX/kQjSbNsVGjMjG73IEVNWUKz6aaNVWtLy0dr/4BOju7GJ' +
                    '7n224/+VZ9/OxjWMgP3DAO+u9VyIsiKeiPDmLr+irMK8+7JstyrYGYQE8g2HjnWaen5fxT5FizkaJpVDpt2La83ASOnm7HK38ErKYhHBzAtjWVqHKObhpf4qijurt77AmJ/rx4y0UuZ8xIKAwNjaYwf+Y47HNXmE' +
                    'B9yz087IyCUTVwBIkE+nGlpVYRKKmUCofDjQe8bzztb/xghwsAAUCArEwBedkZJhDoSyChpACNxKKqUEUZrrIibK2e2ETF4/EX5Z5bFRkCC8gyARhIZKJragFOrp1tAjsO3ca9njgEhnRSGiDwEKUUHu11vaRiA/' +
                    'GgY/t1q91hhdY/gO+RQYQHFbjnlMC7ea4JrG+4idYPQeRm8CjIyQRtyYbvSxAfDy0IpYGdN6w2xxh86fuBRKTf3Ka7shjejZVp4MAttH7qI6ExyMrNRnFuJvxfA/h4kADJZPKFs/5uRYIbhkDSCIGEQm6P25kP7+' +
                    'oZaeDwfbR+F83cIKUiL4tHliziuWceCSEWa/Rc+eA52xGERtFmDozHPbMA3pXT0kDzwzRATsDYHa1r2OC0om5hcRPV29tnj0jU52n773Myy5nbBLkH7lmF8K6angaOPEBr1480oKngFQUde1zKCOpnqXmRItFY46' +
                    'XXQc+my28BlgBkJ0vL8nGiZooJ7D7zFBe7CUBWBjnOU8umYsmkkU2FBfl1JhAKhRheENouvA5Vb7/6DrJx3hQ1pFR0My886R4jaM1kyzVJkmpttiL1TzEZCMvxDb2ivuvko2/czfdBdMVEc6zQMhyLJluxucqmWF' +
                    'i1OaXI9UVFhX+LaWgzcmKUM8dxLkXV7cY3htJ9pJTbJVk+NzY/759y/gUON2pDlqRajwAAAABJRU5ErkJgggo=' +
                    '" />';

var closeButtonIcon = '<img src="' +
                    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAVCAYAAACpF6WWAAAAAXNSR0IArs4c6QAAAAlwSFlzAAALEwAACxMBAJqcGAAAA2lJREFUOMu9VF9oW1UY/917zv3XJC7p0j4YFTTS2RJwrB' +
                    'AGe9hgT0P6KlTX+DBh6WAi00otDhZlXcKwBspo+9i8+DSHvraQMlYznViVjuYhbWY3blNzk9zk3mubP/deH0buGoJuE/SDD8453+/8zvedc74f8B8Y8zTAuXNnjxeLlUy1quPQITf6+nzs0TePvHrxg8tbz0WamJ' +
                    '4KLqd/zDWbLbAsC4ZhwLKsE7csC5SyOH0qTD759Kr1j6Tl4n3mw0tfvLb9sJAjhIBSCkopCCEghDg40zRhmiZarRYCL/qHk1/Gai/0vp5rx8lB0sJuJbj9sJDjOA6iKEIURfA8D57n0T6EEAKO45y5pv15/s7qD1' +
                    '+vrf32qM3j1HQ9/lnP79s7OUEQIEmSQ0gpBcMwYJjHRbXHlFLwPA9RFFFUqpmvZmLHuzK1wTUIoRBFEYIgoF6vIxwOY3BwECsrK8jn81AUBW63GyMjI9B1HYZhgGVZsCyL/AP5/Ww2G3MyTc5ccds2IAgCbNvG7u' +
                    '4uNjc3kclkMDo6WolGo7BtG5IkIZFIYGhoCEtLS5BlGfV63bnzuRvXRCfTQOAl6Mb+ZcuyUCwWUSqVYFkWFEXB1taWNDU1hWw2i0gkgmAwiEgkgr29Pei6jmazCUEQwPM8Go3mt3fv3pMpABQVtW6aJsrlMnRd7/' +
                    'gey8vLWFxcRDwerwDA2NiYr1arOXFVVfE4sQBUVbsHgGEBoNFoQlVVGIbhlHLQ0+k0PB6PD4BvZ2enK65pGiqVCpot68nrM4wNTdOcRzrofr8fs7OzmJ+fhyzLSKVSXRhBEKDrOjhKnpD2+b3HKKWQJKnLk8kkCo' +
                    'UCUqkUpqenEQgEMDk52YXjOA79/d6TAEABIBwO/bp+P4eenp6OdhwfH8fAwACi0ShcLhdkWcbc3BwmJiawsbGB1dXVjvs/dvSN7502fZS/I7z97sS+1+sDx3EOKBQKwTAM5PP5js2hUAgAsL6+7qxRSnDz5jdMR+' +
                    '8nZ65wK7d/abhcrn8ld2+dOeF95+yFapegfPzRRY9a3asdFI9nsYWFhQ4e2iF5iet2PH71sFLSS+1ef5q98nL/8DPp6Xe3Frmf1nINy7L/lowQFrHY58xzK//t9C32wfYf4XJZy+jGPtwuEb29nuHIe+d/xv9tfw' +
                    'FATFKTqjXpOQAAAABJRU5ErkJggg==' +
                    '" />';

var updateGoodIcon = '<img src="' +
                    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAADaElEQVR42lWTX2gcVRTGvzv/dibZmezOrLObmNrGVttKpLKWKGit+NLaB4sU8tAiRPDBFhUf+iBRKiKhvolQoQUtTf' +
                    '8kuytRWzRUCqVYaggl2+oiphZTXKPtNknTpMnu/Llzx7MRH3Lh4zAP3++ee843DHSGhkuFqVr9BYbYA2N+QpM8x1R8XU94kqZT1b2krvkJRfF8HvkiijwWR35jaWmQNQFfnhkZO1SafjZmEiAxhFYSjZ6tMJgAEx' +
                    'ECHkDwEHJI4hHUiGPgGRPJxemDK4Avhr79vXCdPyboKwaDLMtofXoLJElCJGLUI4G7YYT7AYfwSVQ/zSsQ1V/eXgEcOX129psbzCEHdFmCSsp0b0TC0CHiGB4Blghwm4z1kANBhE+eUnG3MrafDRdL0m0pFZybjG' +
                    'S1ebMiQVNkuOsfgZm2/uuAzA/IPEO3/+OH8BshjvYYqJYvv9kE2FejzNzx6x6ycoyMocHUVeTW5JDrdNEg81w9wEw9xPSyjxsk7oX4cWcqrl678kYTsOFSmL15fIrBqS/DSahIkpxMCu1r22mAAvfJcK8RoEZ1iq' +
                    'qgemVHMvrr14nX2VDxq57vvNz4cE1H29IismS2mpBWA+lcBhIEnnMDLPgT8MI5xMwm2Gb0dYL/OVl5jRWKpZeH5t3R72cUaIGHtKIglVBgaCpSTht6n5jDscmjELRShYbLaaCm3IL3N+0V83/c6WWFQnHfpXup0+' +
                    'M1AZ/eu1Bv7lxAp430vdiB0fAIHB1IqYBKMelp34bnH34JBy4exscb+/rZ1yMj74Rh+FlM64qoYU3TEEsKtQuI9Q8wPn8WdsJBLDzYRgZv5T/Cqd9GcPXOOWzLvPozK5fLXRSFrUIINwiCbOD73Zzz3SRpYc0tCs' +
                    '9F9G4+hgu3ziCf245lruFUpR9dbRy28srsSpD+Pz+cP/+453mXVU11FVkB1i7i2uwAut092LmhfyVUAz/tgywmaB4m8g99UF4FKJWK76mKethqs5BOpeFkbZSqB+g5N7EltxeR1I3K3/30v4GG/CR2dR56dxVg8M' +
                    'SJdclk61jatnN22obR0gLZCnBh+kMKUgVcyFBYBDeZx/aOg6OMa7tXAZrn5OCgbVnWftM0dxiG8ShjTDOSiZqcWRTL4WyHqblVS2k/yUPxeVfHJv4vpD6OQ8IRFmYAAAAASUVORK5CYIIK' +
                    '" />';

var badIcon = '<img src="' +
                    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAADW0lEQVR42l2TW2gUVxzGv7Nz2yS7m2xMNpusuWxq3EKLfSsJjVDEtlgLIuQiWJGKF4qlVFpL2bRpDN2l1FYRxZcGBL' +
                    'VaDaIkD5XapIJIQl+KNj4ktFm7ZrOX7H1mNzszOzM9O9G09j8cGGbO9zvn+18I/hfhUMjLctxBXhC2EV33GoYBg5BQaXV1WlXksc7NvtB/95NnL08eP2ZYhhnlCtLxJ1cucisz9yGnk+Y/oX4DGnt64dmzVy1yws' +
                    'myrg9v8vm0dcBSOMzwPD8u3bm9e+HcaVid9WAF6zrdoKssl1DKpNF19CNwW1+/qShKfwVi7kksLweKUz/7F8+fQbWrCbzNDr0g/QugBIvNBkUSUUjE0fn+hyA9vcGOrq4hEo1EvNaCNP9g3yBnc7vhenMH3O/ux9' +
                    '8jn0NZ/GvNwgub0P7lV4hcuoDknduQYjG8dOGyKrKcj6SSyUD67Hf+/G+zqKpvQNf578E6alEW84gOD4EQguYTATB2O7WQwdyh/SBFCY5Xu1H13pEgEfP5mfDAO91cTTU1SlDV2UkFQSpwQKMQQh8LFcvZLB4e+w' +
                    'C1mRTA0K2FIlwXx2eJmM3Gwm+91uTwbYQmGdCTUTDtLWg59yO9SZ1poSJ+cHgPGmPLsDQ0w1JDIC4swT0xFScSBSxRQM2LHmjpRWh5CcLmLXB/ew3MU4CSyyL+ySDUhYf0mx2M0wtpPgLX5DQFSNJMvO/tbsYiQp' +
                    'ejsG55Ga7R62BsTvNkmgLwtXXUTgaxLwag/DEHi9AMTbej7vKNWZLNZALymW/84sQlMM02tF65T0+pN8Vzn/ajpVGD67MbNCdOlHNp/DnQCzYhwr5rH4xDR4NkJZHwVou5+ejgGxwsMux9e+E46MfcMeo5/7tpgW' +
                    '17BU0nruHR6a9hnfwBLHi4rv6k5nirz+yVbCoVwK8T/pUALRtnYJVeuUbP0O552kk6TSTrBEnmwNAGbhgKQO7eHnS3tg6tdWI8xgiCMG7cvbU7dWoEel41QZVymUFFhkrLaeOw4eMRqD07bpbkUn9re4e2PkwVCM' +
                    '9xo7yUOl6cHOOK935BORZZs+D2oHrrdlh3HlCLguOkopaHN7a1ac9N47NI0pxUxpmubdDK3sogGBYmRIdnWpXlMbfH89w4/wNi4WxKCJsyDQAAAABJRU5ErkJgggo=' +
                    '" />';

var processIcon = '<img src="' +
                    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAADhklEQVR42nVTbWxTZRQ+7/3qvbe77W1X0q7r1i0q/KCMtQsdDscSidkH1GEd/tAtmkwHw0Wz6B+dwcQsmiEyBzMm6D' +
                    'aSZcHIDGNCXIjRoWFKYjrBNoyW6Uqh7b3Yfdkv6Mf13RINBjnJ++PkPec55zznOQgeYoPHjzkZhjHlcjlf58FX5x8Wh+53RoY+30aSVJei5Ns1Wu14SWlpc8DvfyORSJzZYNhwKJ6I97zQ2hb+X4B33n6rwPV0c2' +
                    'izzSae+3qyWxTFequ1rGFu7loPRdNVDE27s9nsd7v3uHY9ADB4bKBJpWI9Gq2mbe8z7sOyJClrf3lFgbvptBJbjEEmk1XuyFJNKpnMEASZf7619dd1gP6PjphqduzwcxwPweDCdG3tThduFTL3MoAIjI+h1nzMRU' +
                    'aW5EmSJPYmk0lPNBKpfrljv4I+7Our2FKxZczuqLKp1WqQZRlEUQs3AjckRVH8hQZDFUWS/BpINBoFgiDgr5XVc6HQzbau115fRgP9R0VB0NBGk2nCbrfXkBQFsx7P+UQi3vJsy770xUs/WAp1+kscz5XeXpZASW' +
                    'UvRhflAyvR2K2O9v1xNH76yyWj0Sjq9YXAcRyw+F29csXR0Ng4uzbj996Z7rPhmb6pm5fprJIHhqCgqaQa6tCmKddTuxvR2YkzS7hNTLoIQoEAPB7j+tw1xxO1O2d/CvyyZ8D/1WQwEUICA0BjSgx8EVQUVoJPDu' +
                    'SfM9btQp8MHhdxIl1WXjZhNJpqdHo95kE6n7ybbIlwsQsnAiO1Fp4FgaaAxtUPVvbArfgSvHv5feh89KVv0MnhoQpzcfGYimVtLMuCxVICeOcQjoQlH/pZH0l9Sz9u6YTphdPgND8JjqIGeG/mTShRx8DINEloZG' +
                    'jIhKv7EVqXxLTZXOyiMQDCbP+WnobfV4bBtfEIiKwVCmgtDHsH4M7KKeAZFh4ROhfWs8ZGR5vwnj2CRmgrMpsP8xyviDoR5fkMnPS6QUUqsG/zCUjmNPDFVTdwVA4yigbc5Z9+9q+UP+jtLXBu3x4iSEKMhMPdOp' +
                    '2ufpuzusG3egF+DPUCgQgAwooFdR1Hs1BXeuhPPVHueOCYsO67UqlUOz6e8Uq7vfmP4PyocRNnD6xO2ZbTIdCxZbBRW++hFPWLj5m3ev8DcL993H/USVGUSaVifK90HJiXF29vRYiwZHP3gkUGq/efuL8BeLNcQJ' +
                    'E3FaMAAAAASUVORK5CYIIK' +
                    '" />';

var goodIcon = '<img src="' +
                    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAADA0lEQVR42o2TWWgTURSG/8nMnUlsNTFNTNN0IVpbu6i0GFD0xQ2xD4pCq2JBpa2CBVFwI2KqYgISX3wRtSrqq2ARBL' +
                    'F1AZG2UrTigxIJxEbSNm3aLE06yUwm42TEuDyIBwYu95zz3bPMT+EvC4x9tROG6eQ4blNOztnVSxkBPs2/FAThdk11TeD3eOrnYSw4Rmto+lJCw5+6/vEReREcQTgVU32WBQZsrnLgSMNOUScw3pwkuWqX10oFQP' +
                    'BbkGZZ9mHf+OtdF4buoKTIAC1hf+FlIC0ImFGAPes6sL3E0adU05qHqCHjkxPux5NvnBdH7sKmN0FLA1XFZnjXn1XzDz7vQSqbREZ5MxSPwOU4hK2GZs9ye/U5KjQesicY3rfpSTdZYTBjMQF0tIzKhVZ4NnhVwN' +
                    '6n3WAQVyAUolnAF5tG/7ZropbX1FKRmYj7qq/X+X5yFKU6gmJCKRXQsBbbcHKNWwV0DByDnsTBSxKSIjDBi2i2NKG7Yp+Hmkskhk4O719r4BagiLVBx+jAagj0rB4HGo+rgPODHpg4AWIui4Q4j5QQQlxIw9PUO0' +
                    'zF52KTZwZbLE2mJdjTcAt6zox/2dfEBHo/dGFqPgb3mkdhFeB622JpNJrQVn8Ti7jS/wIkhChcTX1hKplMDnlH29cayBQ04KChGOVjUVq8Grvrfszg8tBpGJlPyMn5NiRIcgaxrBkn6pUWorGo+2nontMfuaGsXS' +
                    'q8ZNTZcdTRr56PDuxAGfe54JNkGtWmI9hobPNQ09NTdpHlfTdH2wmNCVDUvwGy8lMJshWHV90X5ZSyxvzlbHTW7Z8fcT7zO5WAuAoxaCvQvurBjy286YKF9avJOUqP7cvcKNc0emxl5edUQDgcpjkt9zDIv9s1EL' +
                    'iCZCagzEEulJxPlJUGi1g7tiw9jTLNyr50Ot1aWVklFcSUh7AsuZQj6VOfZgbIl9lXSGRCqm8hZ0ONcSPqFm8WczzjFQXBVV5R+UtMv1t+JoSQToYhipwlVc6UTAUEUVDlbLWW/SHn7/7NSUl252Y9AAAAAElFTk' +
                    'SuQmCCCg==' +
                    '" />';

var warningIcon = '<img src="' +
                    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACgUlEQVR42pWST0gUURzHv29n/7S7rpuhlroW/kFdobQ8qBgdxItWB6NDkVAdukREWdShEr3YHyiicwQlJRJJEP2hOo' +
                    'Vmapq1qbEuaWq7Cu6s6+7OjLuz7zU7I1aYZXP5vWHm++Hzvu8R/OURJ15YGZWZJXePsNo/ZLUPYc9jS0ykQ0yWKKen2+1bG8T/AoS+tLf4J4UmeVFEaqaueX3Z8ZY1AxZGbm+e9y2OJttDFqoAeB+N2NMNRWm7mq' +
                    'bXBOAHb7YHJkMHHPnzYDEJYwNMsdA/yKi7deifgOCnqzu9I+E3jnyeuH0S5KiEApsE9wBYdpGlKrO+rWdVwMLHZl2El/pEPliWlRfAjYdALCbiTG0QnveA2Wbqs9qNFVkHn7A/Avjes0fH+4N3nBVz0FEB1zoAWQ' +
                    'GcqwtCDkvoeUZQXLnh8JZjb++tAPi7T9v8EwG3ycRvSncEwaR5NN8NKR2EcGmvABbX4duoEYJg86bnpBXmnugP/waYfXnkytd+//mSqilQYQosGsHlTgPMBuBkjWIcJ6CyDl3PzXCWp7XmN7ouLANmnzbkTrrmhr' +
                    'McnnW2pO8AUwKUoMtDYOKAsgxOMSCqBT/DYdxtlnJKHMV5p96Nq4CJttrO6aGx+m2VXk0nUREjGJll6rooRa8aJABMJhjoNsJRkPrIefHzfuLt2F3teuV5XVrpJWYrU7NY6rixnVPn9X3QwgokARLDBIO9RuYsz6' +
                    '4mrtaSD8Kct7Rwx6KyHy3JmFZNnFDVRBfVa2GasNBg7mEOJmvyIBlqyuOn3ZGUFVeK/TqJOjU7srRFICPTwBPf/ZokvSV5I8D9PJPlMFH7VN/p0poSDRKniIYCMz8A9QcpP1oZxJMAAAAASUVORK5CYIIK' +
                    '" />';

var hideIcon =    '<img src="' +
                    'data:image/gif;base64,R0lGODlhEAAQANU/AP////8zM/f39+3t7YCAgOXl5fX19fT09BkZGdPT0xUVFbS0tMvLy4eHh/9LS/v7++Hh4aAVEtvb2/j4+M9NTKQWFMcuLDw8PMMcGkpKSrq6uqQVFKkXFawYFs' +
                    'YcGqAUEqcmI5GRkf7+/qenp6+vr/Pz87u7uwMDA/9ra/5ycmNjY2lpaf5HR8gdGs3Nzf+Hh8AbGtLS0vr6+psUEdjY2NnZ2dJOTP/b26MWE+fn56cWFL0bGKsXFa4YFp0UEgAAACH5BAEAAD8ALAAAAAAQABAAAA' +
                    'aYwJ9wSCwaA8ikkRhoeTyYwFKoQNkoFpiUqFCNCoJwgbCTIhDCDOAhAAAMgwQhREgwSD+FyO2G1wYCEwYQDEIPfAIDEoAAMm8JQhp8BTk0A3wAAgVCDm4CBAQml3wHmz8BNwApAT08BAUHsS4EQw0ADQEdOjgRLG' +
                    'dFFwAxATwVID5bRSclAA4cGx8zyUULAC9JSFMrAAtTQkEAOw==" />';

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
var autoLog = true;
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
//alert('INIT');
	//console.log('do init');
  var settingsOpen = false;
  var debug = isChecked('enableDebug');
	//console.log('debug is:'+(debug? 'true' :'false'));

  // Check for a version change.
  if (GM_getValue('version') != SCRIPT.version ||
      GM_getValue('build') != SCRIPT.build) {
     //console.log('do ver chg');
    handleVersionChange();
     //console.log('did ver chg');
  }



  // Check for missing settings.
//console.log('settings check');
  
  if (GM_getValue('isOld') == undefined) {
    saveDefaultSettings();
//console.log('saved default');
    addToLog('info Icon', 'If you want to customize your view, please adjust your settings.');
//console.log('logged it');
  }
//console.log('do refresh settings');
	refreshSettings();
//console.log('refresh done');

  var initialized = true;
//console.log('log refresh');
  DEBUG('Completed initialize.');
} else {
 alert('ALREADY INIT -- tell MrPete!');
}

//
// CODE HERE
//
DEBUG('Set up masthead');
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
				rcList[sTopic]+= '<li class="recentcomments"><a href="'+sURL+'" title="View the  comment by '+sAuth+'"><span class="commentAuthor">'+sAuth+'</span></a></li>\n';
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


DEBUG('Initial site-dependent comment page prep');
if (!$j(cmtForm.listID).length) { // don't waste time on non-comment pages
	DEBUG('Not a comment page');
	return; 
} 

switch (siteType) {
/*	case 'Lucia':
		$j('#comment').val(''); // clear comment block; has tabs for some reason??!
		$j('.comment').wrapAll('<div id="commentlistOL"></div>'); // Wrap up comments inside a div
		
		break; */
	default:
		$j(cmtForm.listID).attr('id','commentListOL');
}

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
//
// Lucia's Fix (comments need id's, auths marked, dates extracted, etc)
//

function setCommentInfo(elm) {
	//console.log('finding id');
	var iFound=1;
	var bIsComment=1;
	
	var div = $j("p.commenticon",elm).get (0);
	
	for (var i in div.childNodes) {
		if (!bIsComment || iFound > 6) break;
		var child = div.childNodes[i];
		if (child.nodeType === 1 || child.nodeType === 3) {
			//console.log ('childTxt: "'+child.textContent+'" (iFound:'+iFound+')');
			//console.log ('childHTML:'+child.innerHTML);
			switch (iFound++) {
				case 1: var sAuth = child.textContent.trim();$j(child).addClass('comment-author');break;
				case 2: break; // paren
				case 3: if (child.textContent != 'Comment') bIsComment=0;
								break;
				case 4: var sId = child.textContent.replace(/\#([\d]+)\)/,'Comment-$1').trim();break;
				case 5: break; // blank
				case 6: var sDate = child.textContent.trim(); break;
			}
		}
	}
	if (bIsComment) {
			$j(elm).attr('id',sId);
		
		// Now set up the id, reply link, etc
		var cmtURL='#'+elm.id;
		var cmtDateStr = getCmtDate(sDate,false);
		var cmtDate = new Date(cmtDateStr);
		cmtDates[elm.id]=cmtDate.valueOf();
		if (isNaN(cmtDates[elm.id])) {
			DEBUG('NaN: "'+cmtDateStr+'"');
		}
		$j(cmtForm.replyElm,elm).append('<span class="meta-sep"> | </span><a class="comment-paste-link" title="'+sReplyTxt+'" href="'+cmtURL+'">'+sReplyTxt+'</a>');
	}
}

//
// ADD REPLY LINKS
//
var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function setReplyLink(elm) {
	var cmtURL='#'+elm.id;
	var cmtDateStr = getCmtDate($j(cmtForm.dateText,elm).text(),false);
	
	var cmtDate = new Date(cmtDateStr);
	cmtDates[elm.id]=cmtDate.valueOf();
	if (isNaN(cmtDates[elm.id])) {
		DEBUG('NaN: "'+cmtDateStr+'"');
	}
	var dbgText = ''; // (debug ? '<br/><small>(id:'+elm.id+',dt:'+cmtDateStr+')</small>' : '');
	$j(cmtForm.replyElm,elm).append('<span class="meta-sep"> | </span><a class="comment-paste-link" title="'+sReplyTxt+'" href="'+cmtURL+'">'+sReplyTxt+'</a>'+dbgText);
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
		var cmtDateStr = getCmtDate($j(cmtForm.dateText,cmtElm).text(),false);
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
//	console.log('Fixing '+i);
/*	if (siteType=='Lucia') {
		setCommentInfo(this);
		if (bHideOld || bColorAge) AgeComment(this);
	} else {	 */
		setReplyLink(this); // only need to do this one time
		if (bHideOld || bColorAge) AgeComment(this);
//	}
}


function setupComments() {
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
	  	DEBUG('UNthreaded, '+$j(cmtForm.listElm).length+' items');
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
// Comment preview arrives through the new CA-Assist-Comment module :)
//




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
  
  $j(cmtForm.topDiv).append('<div style="position: absolute; top: 30px; right: 25px; text-align: left; font-size: 11px; font-weight: bold; color: #FFD927">'+wpaTitle+'</div><div id="wpa_menu" style="position: absolute; top: 40px; right: 25px; text-align: left;"><span id="wpa_settings">Settings</span> | <span id="wpa_log">Log</span></div>');
  
	$j('span#wpa_settings').click(toggleSettingsBox);
	$j('span#wpa_log').click(showLogBox);

  // Show resume or paused based on if we are running or not.
//  updateMastheadMenu();
}

// ********************************************************************
// ********************************************************************
// DEBUG AND LOG BOX
// ********************************************************************
// ********************************************************************


function showLogBox() {
  if (!$j('#wpaLogBox').length) {
    createLogBox();
  } else {
    $j('#wpaLogBox').css('display','block');
  }
  if (!debug && GM_getValue('logOpen') != 'open' &&
      !isChecked('autoLog')) {
    alert('Logging is not enabled. To see new activity here, please open your settings and check "Enable logging" in the General tab.');
  }
  GM_setValue('logOpen', 'open');
}

function hideLogBox() {
  $j('#wpaLogBox').css('display','none');
  GM_setValue('logOpen', 'closed');
}

function clearLog() {
  GM_setValue('itemLog', '');

  //reset the log box
  $j('#logBox').text('');
}

function createLogBox() {
  // Define CSS styles.
  makeElement('style', document.getElementsByTagName('head')[0], {'type':'text/css'}).appendChild(document.createTextNode(
    '#wpaLogBox div.mouseunderline:hover{text-decoration:underline}' +
    '#wpaLogBox .logEvent{border-bottom:1px solid #333; padding:4px 0px}' +
    '#wpaLogBox .eventTime{color:#888; font-size: 10px; width:75px;  float:left}' +
    '#wpaLogBox .eventBody{width:330px; float:right}' +
    '#wpaLogBox .eventTime,#wpaLogBox .eventIcon,#wpaLogBox .eventBody{}' +
    '#wpaLogBox .eventBody .good {color:#52E259;font-weight:bold;}' +
    '#wpaLogBox .eventBody .bad {color:#EC2D2D;font-weight:bold;}' +
    '#wpaLogBox .eventBody .warn {color:#EC2D2D;}' +
    '#wpaLogBox .eventBody .user {color:#FFD927;}' +
    '#wpaLogBox .clear{clear:both}' +
    '#wpaLogBox .logEvent.Icon{background-repeat: no-repeat; background-position: 75px}' +
    '#wpaLogBox .logEvent.process.Icon{background-image:url(' + stripURI(processIcon) + ')}' +
    '#wpaLogBox .logEvent.warning.Icon{background-image:url(' + stripURI(warningIcon) + ')}' +
    '#wpaLogBox .logEvent.info.Icon{background-image:url(' + stripURI(infoIcon) + ')}' +
    '#wpaLogBox .logEvent.updateGood.Icon{background-image:url(' + stripURI(updateGoodIcon) + ')}' +
    '#wpaLogBox .logEvent.good.Icon{background-image:url(' + stripURI(goodIcon) + ')}' +
    '#wpaLogBox .logEvent.bad.Icon{background-image:url(' + stripURI(badIcon) + ')}'
  ));


  var wpaLogBox = makeElement('div', document.body, {'id':'wpaLogBox', 'style':'position: fixed; right: 30px; top: 55px; bottom: 10px; width: 450px; background: black url(http://climateaudit.files.wordpress.com/2009/11/climateauditbannerplain.jpg) no-repeat; text-align: left; padding: 5px; border: 1px solid; border-color: #FFFFFF; z-index: 98; font-size: 12px;'});

  var logClrButton = makeElement('div', wpaLogBox, {'class':'mouseunderline', 'style':'position: absolute; left: 5px; top: 0px; font-weight: 600; cursor: pointer; color: rgb(255, 217, 39);'});
    logClrButton.appendChild(document.createTextNode('clear log'));
    logClrButton.addEventListener('click', clearLog, false);

  var closeLogButton = makeElement('div', wpaLogBox, {'class':'mouseunderline', 'id':'wpa_close_log','style':'position: absolute; right: 5px; top: 0px; font-weight: 600; cursor: pointer; color: rgb(255, 217, 39);'});
    closeLogButton.appendChild(document.createTextNode('close'));
    closeLogButton.addEventListener('click', hideLogBox, false);

  var title = 'Click to toggle debug log';
  var debugElt = makeElement('div', wpaLogBox, {'class':'mouseunderline', 'title':title,'id':'wpa_debug_log', 'style':'position: absolute; right: 80px; top: 0px; font-weight: 600; cursor: pointer; color: rgb(' + (debug ? '255' : '100') + ', 0, 0);'});
    debugElt.appendChild(document.createTextNode('debug'));
    debugElt.addEventListener('click', debugOnOff, false);

  var logBox = makeElement('div', wpaLogBox, {'id':'logBox', 'style':'position: absolute; overflow: auto; right: 0px; top: 20px; bottom: 68px; width: 448px; background-color: #111111; font-size:11px; color: #BCD2EA; text-align: left; padding: 5px; border: 1px solid;'});
    logBox.innerHTML = GM_getValue('itemLog', '');
}

function debugOnOff() {
  var debugElt = document.getElementById('wpa_debug_log');

  if (isChecked('enableDebug')) {
    addToLog('info Icon', 'Debug logging disabled.');
    GM_setValue('enableDebug', 0);
    debug = false;
    if (GM_getValue('logOpen') != 'open') {
      alert('Debug logging disabled.');
    } else {
      if (debugElt) debugElt.style.color = 'rgb(100, 0, 0)';
    }
  } else {
    GM_setValue('enableDebug', 'checked');
    debug = true;
    showLogBox();
    addToLog('info Icon', 'Debug logging enabled.');
    if (debugElt) debugElt.style.color = 'rgb(255, 0, 0)';

    debugDumpSettings();
  }
}

function DEBUG(line, level) {
  var level = (level == null) ? 0 : level;
  if (debug) {
    addToLog('info Icon', line);
    GM_log(line, level);
  }
}
  
function isLoggable(line) { return 1; } // maybe someday

function addToLog(icon, line) {
  if (!debug && !isChecked('autoLog')) {
    return;
  }
  // Do not log anything if log filter condition is met
  if (!isLoggable(line)) {
    return;
  }

  // Create a datestamp, formatted for the log.
  var currentTime = new Date();
  var m_names = new Array('Jan', 'Feb', 'Mar',
    'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
    'Oct', 'Nov', 'Dec');
  var timestampdate = m_names[currentTime.getMonth()] + ' ' + currentTime.getDate();

  // Create a timestamp, formatted for the log.
  var hours = currentTime.getHours();
  if (hours >= 12) {
    hours = hours - 12;
    var ampm = ' PM';
  } else {
    var ampm = ' AM';
  }
  if (hours == 0) {
    hours = 12;
  }
  var timestamptime = hours + ':' +
    (currentTime.getMinutes() < 10 ? 0 : '') +
    currentTime.getMinutes() + ':' +
    (currentTime.getSeconds() < 10 ? 0 : '') +
    currentTime.getSeconds() +
    ampm;

  // Get a log box to work with.
  var logBox = document.getElementById('logBox');
  if (!logBox) {
    if (!addToLog.logBox) {
      // There's no log box, so create one.
      addToLog.logBox = document.createElement('div');
      addToLog.logBox.innerHTML = GM_getValue('itemLog', '');
    }
    logBox = addToLog.logBox;
  }
  var logLen = logBox.childNodes.length;

  // Determine whether the new line repeats the most recent one.
  var repeatCount;
if (!logLen) console.log("No logLEN!!");
  if (logLen) {
    var elt = logBox.firstChild.childNodes[1];
    if (elt && ((elt.innerHTML).untag()).indexOf(((line).untag())) == 0) {
      if (elt.innerHTML.match(/\((\d+) times\)$/)) {
        repeatCount = parseInt(RegExp.$1) + 1;
      } else {
        repeatCount = 2;
      }
      line += ' (' + repeatCount + ' times)';
    }
  }

  // Create the new log entry.
  var lineToAdd = document.createElement('div');
  lineToAdd.className = 'logEvent ' + icon;
  lineToAdd.innerHTML = '<div class="eventTime">' + timestampdate + '<br/>' +
                        timestamptime + '</div><div class="eventBody">' +
                        line + '</div><div class="clear"></div>';
  // Put it in the log box.
  if (repeatCount) {
    logBox.replaceChild(lineToAdd, logBox.firstChild);
  } else {
    logBox.insertBefore(lineToAdd, logBox.firstChild);

    // If the log is too large, trim it down.
    var logMax = parseInt(GM_getValue('autoLogLength', 300));
    //GM_log('logLen=' + logLen + ', logMax=' + logMax);
    if (logMax > 0) {
      while (logLen-- > logMax) {
        logBox.removeChild(logBox.lastChild);
      }
    }
  }
//console.log('atl save');

  // Save the log.
  GM_setValue('itemLog', logBox.innerHTML);
}

function debugDumpSettings() {
  // Use showIfUnchecked() to show 0 value as "un-checked", or showIfSelected()
  // to show 0 value as "not selected" (for radio buttons).

  DEBUG('[code]>  >  >  >  >  BEGIN SETTINGS DUMP  <  <  <  <  <<br>' +
        'Script Version: <strong>' + SCRIPT.version + ' build ' + SCRIPT.build + '</strong><br>' +
        'Language: <strong>' + document.documentElement.lang + '</strong><br>' +
        '-------------------General Tab-------------------<br>' +
				'New comments (hrs): <strong>' + GM_getValue('isNew') + '</strong><br>' +        
				'Old comments (hrs): <strong>' + GM_getValue('isOld') + '</strong><br>' +        
        'Comment coloring: <strong>' + showIfUnchecked(GM_getValue('bColorAge'))+ '</strong><br>' +
        'Comment hiding: <strong>' + showIfUnchecked(GM_getValue('bHideOld'))+ '</strong><br>' +
        'Threaded display: <strong>' + showIfUnchecked(GM_getValue('bShowThreads'))+ '</strong><br>' +
        'Most-recent last: <strong>' + showIfUnchecked(GM_getValue('bRecentLast'))+ '</strong><br>' +
        'Reorganize Recent Comments: <strong>' + showIfUnchecked(GM_getValue('bReorgRcntCmt'))+ '</strong><br>' +
        '---------------------Display Tab--------------------<br>' +
        'Enable logging: <strong>' + showIfUnchecked(GM_getValue('autoLog')) + '</strong><br>' +
        '&nbsp;&nbsp;-Logging length: <strong>' + GM_getValue('autoLogLength') + '</strong><br>' +
        '>  >  >  >  >  END SETTINGS DUMP  <  <  <  <  <[/code]');
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
var elt;


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
      '#settingsBox #tabNav div{border-right:1px solid #000;float:left;padding:0 7px;position:static;text-align:center}' +
      '#settingsBox #tabNav div.selected{background-image:url(' + stripURI(tabSelectedImage) + ')}' +
      '#settingsBox #tabNav div a{color:#fff;font-weight:700}' +
      '#settingsBox .fancy_button{position:absolute;background-image:url(' + stripURI(redBgImage) + ');border:1px solid #FFD927;color:#FFD927;cursor:pointer;display:block;float:left;font-size:14px;font-weight:700;padding:5px;text-decoration:none;width:auto}' +
      '#settingsBox .fancy_button button{background:transparent;border:medium none #FFF;color:#FFD927;cursor:pointer;font-size:14px;font-weight:700;margin:0}' +
      '#settingsBox .fancy_button button:hover{color:#BCD2EA;font-weight:700;text-decoration:none}' +
      '#settingsBox .tabcontent{display:block;top:60px;bottom:60px;left:10px;right:10px;}' +
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
  var settingsBox = makeElement('div', elt, {'style':'position: fixed; top: 10px; right: 10px; width: 400px; height: 480px; font-size: 14px; z-index: 100; color: #BCD2EA; background: black url(http://climateaudit.files.wordpress.com/2009/11/climateauditbannerplain.jpg) no-repeat;background-position: 0 -50px; text-align: left; padding: 5px; border: 1px solid; border-color: #FFFFFF;', 'id':'settingsBox'});

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
  var elt, title, id, label;
  var generalTab = makeElement('div', null, {'id':'generalTab', 'class':'tabcontent', 'style':'width:380px;background: #003;'});

  // Container for a list of settings.
  var list = makeElement('div', generalTab, {'style':'position: relative; top: 10px; margin-left: auto; margin-right: auto; width: 98%; line-height:125%;'});


  // Logging option
  var sLogging = ''+
'<div><b>Logging</b><br/>\n'+
'	<div class="lhs">\n'+
'		<label for="autoLog" title="Check this to enable logging.">Enable logging:</label>\n'+
'	</div>\n'+
'	<div class="rhs">\n'+
'		<input id="autoLog" type="checkbox" title="Check to enable logging." style="vertical-align: middle;" value="checked"'+
((GM_getValue("autoLog",'checked')=='checked') ? ' checked="checked"' : '')+'/>\n'+
'	</div>\n'+
'</div>\n'+
'<br class="caaHide"/>\n';

  $j(list).append(sLogging);

  // Site Fixup options
  var sFixups = ''+
'<div><b>Site Fixups</b><br/>\n'+
'	<div class="lhs">\n'+
'		<label for="bReorgRcntCmt" title="Check this to reorganize the Recent Comments sidebar.">Reorganize<br/>Recent Comments list:</label>\n'+
'	</div>\n'+
'	<div class="rhs"><br/>\n'+
'		<input id="bReorgRcntCmt" type="checkbox" title="Check this to reorganize the Recent Comments sidebar." style="vertical-align: middle;" value="checked"'+
((GM_getValue("bReorgRcntCmt",'checked')=='checked') ? ' checked="checked"' : '')+'/>\n'+
'	</div>\n'+
'</div>\n'+
'<br class="caaHide"/>\n';
  
  $j(list).append(sFixups);

  // New/old comment timing
  var sNewOld=''+
'<div><b>Thread Age Highlighting</b><br/>\n'+
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
'<br/><div><b>Display ReOrder</b><br/>\n'+
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
  GM_setValue('autoLog', 'checked');
  GM_setValue('autoLogLength', '300');
  GM_setValue('enableDebug','checked');

	GM_setValue('isNew', '8');
	GM_setValue('isOld', '24');
	GM_setValue("bColorAge",'checked');
	GM_setValue("bHideOld",'checked');
	GM_setValue("bShowThreads",'checked');
	GM_setValue("bRecentLast",'checked');
	GM_setValue("bEnableOrder",'checked');
	GM_setValue("bReorgRcntCmt",'checked');


  // Other settings.
  GM_setValue('logOpen', 'open');

  addToLog('process Icon', 'Options reset to defaults.');
}

function helpSettings() {
  // Open the instructions page.
  var tabs = document.getElementById('tabNav');
  var helpName;

  // Get the active tab and open corresponding wiki page
  if (tabs) {
    for (var i = 0, iLength=tabs.childNodes.length; i < iLength; ++i) {
      if (tabs.childNodes[i].className == 'selected')
        helpName = tabs.childNodes[i].id;
    }

    window.open('http://climateaudit.org/ca-assistant/#' + helpName);
  }
}

function saveSettings() {
	
	autoLog      = (document.getElementById('autoLog').checked === true);
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
	saveCheckBoxElementArray(['autoLog','bColorAge','bHideOld','bShowThreads','bRecentLast','bEnableOrder','bReorgRcntCmt']);

  toggleSettingsBox();
}

function refreshSettings() {
	autoLog    = GM_getValue('autoLog','checked');
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
