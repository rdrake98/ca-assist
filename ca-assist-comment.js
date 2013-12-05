var $j = jQuery.noConflict();

$j('head').append("<link href='http://www.climateaudit.info/ca-assist/ca-assist.css' type='text/css' rel='stylesheet'>"); // grab CSS for the mess we're about to create...


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

