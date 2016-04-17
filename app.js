/*
 * This file is a part of project https://github.com/HarpyWar/myinstants-player
 * (c) 2016 HarpyWar <harpywar@gmail.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

var itemsCount = 0; // overall items count
var currentPage = 0; // current page offset
var itemsOnPage = 180; // limit on page (const)
var searchText = ""; // limit on page (const)
var bookmarks;

var itemTemplate,pageListTemplate; 

$(document).ready(function(){

	bookmarks = new Bookmarks();

	itemTemplate = Handlebars.compile( $('#item-template').html() );
	pageListTemplate = Handlebars.compile( $('#pagelist-template').html() );

	
	loadItems();
	
	// event on enter 
	$('#search-box').keypress(function (event) {
		if(event.which === 13){
			// only if button is enabled
			if ( $("#do-search").attr('disabled') == false )
			{
				$("#do-search").click();
			}
		}
	});
	$("#do-search").click(function() {
		searchText = $("#search-box").val().trim();
		currentPage = 0;
		loadItems();
	});
	

	// tab items
	$('#tab-all').click(function(){
		currentPage = 0;
		loadItems();
	});
	$('#tab-fav').click(function(){
		currentPage = 0;
		loadItems(true);
	});

});



function updateBinds()
{
	var i = 0;
	$("#items .row-container").each(function(){
		items[i].btnEl = $(this).find(".switch input:checkbox");
		items[i].durationEl = $(this).find(".row-duration span");
		
		items[i].btnEl.bind('click', play);
		i++;
	});
	
	// fav buttons
	$(".fav").click(function(){
		var id = $(this).attr('data-id');
		// bookmarked
		if ( $(this).hasClass('active') ) {
			bookmarks.remove(id);
			$(this).removeClass('active');
		} else {
			bookmarks.add(id);
			$(this).addClass('active');
		}
	});
}

function loadItems(fav)
{
	var payload = {};
	if (fav) {
		if ( bookmarks.isempty() ) {
			alert('You have no favourite sounds yet');
			return;
		}
		payload.ids = bookmarks.toString();
	}
	$("#items").css("opacity", 0.4);
	$("#do-search").attr('disabled', true);
	
	if (fav) {
		$('#tab-all').removeClass('active');
		$('#tab-fav').addClass('active');
	} else {
		$('#tab-all').addClass('active');
		$('#tab-fav').removeClass('active');
	}
	
	$.post('https://api.cleanvoice.ru/myinstants/?type=many&search=' + encodeURIComponent(searchText) + '&offset=' + (currentPage*itemsOnPage) + '&limit=' + itemsOnPage, payload, function(data){
		var json = JSON.parse(data);
		items = json.items;
		itemsCount = json.count;
		$("#items").html( itemTemplate(json) );
		
		updatePageNavigator();
		updateBinds();
		
		$("#items").css("opacity", 1.0);
		$("#do-search").attr('disabled', false);
		//$("#search-box").focus();
	});
}



function updatePageNavigator()
{
	// page navigator
	var pages = [];
	for (var i = 0; i < Math.ceil(itemsCount / itemsOnPage); i++)
	{
		var selected = (i == currentPage) ? true : false;
		pages.push({ number: i+1, selected: selected });
	}
	$(".pagelist").html(pageListTemplate(pages));
	
	$(".select-page").click(function(){
		if (currentPage-1 == $(this).text())
			return false;
	
		currentPage = $(this).text()-1;
		$(this).addClass('loading');
		
		if ( $('#tab-all').hasClass('active') ) {
			loadItems();
		} else {
			loadFavItems();
		}
		
		return false;
	});
}


var elapsedInterval;
var items;
var currentIdx; // current or last played index

// to modify item
function getItemIndexById(id)
{
	for (var i = 0; i < items.length; i++)
	{
		if ( items[i].id == id )
		{
			return i;
		}
	}
	return false;
}

function play()
{
	var $btn = $(this); // el
	currentIdx = $btn.attr('data-idx');

	var playUrl = 'https://api.cleanvoice.ru/myinstants/?type=file&id=' + items[currentIdx].id;
	
	$("#audio-container").html('<audio autoplay><source src="' + playUrl + '" type="audio/mpeg"></audio>');
	
	playAllowed($btn);

	//
	// HINT: here may be your implementation to send audio url 
	//       to another service like SinusBot API
	//       something like the following code:
	/*
	$.post('yourapiurl', {
		'url': encodeURIComponent(playUrl)
	}, function(){
		playAllowed($btn);
	});
	*/
}




// activate button
function playAllowed($btn)
{
	currentIdx = $btn.attr('data-idx');
	
	var duration = Math.ceil(items[currentIdx].duration);
	var $duration = items[currentIdx].durationEl; // el
	if ($duration.text() != duration)
	$duration.text(duration); // reset duration

	//console.log(duration);
	
	// and clear old interval (may be from another checkbox)
	clearInterval(elapsedInterval);

	// update current status
	items[currentIdx].play = true;
	// check button always on click
	//$btn.attr('checked', true);
	
	
	setTimeout(function(){
		// reset all status
		for (var i = 0; i < items.length; i++)
		{
			// ignore current clicked
			if (i == currentIdx)
			{
				continue;
			}
			// if playing
			if (items[i].play == true)
			{
				//console.log(i);
				items[i].play = false;
				// uncheck button
				items[i].btnEl.attr('checked', false);
				// reset duration
				items[i].durationEl.text( Math.ceil(items[i].duration) );
			}
		};
	}, 1000);

	// decrease immediately by 1 second
	$duration.text( $duration.text() - 1 );
	
	// update elapsed time of track playing
	elapsedInterval = setInterval(function(){
		var currentDuration = parseInt( $duration.text() );
		$duration.text( --currentDuration );
		if (currentDuration < 0)
		{
			clearInterval(elapsedInterval);
			$duration.text( $duration.attr('data-init') );
			
			$btn.attr('checked', false);
		}
	}, 1000);
}










Handlebars.registerHelper('ceil', function(value) {
  return Math.ceil(value);
});

Handlebars.registerHelper('highlight', function(inputText) {
	if (searchText.length == 0)
	{
		return inputText;
	}
    var index = inputText.toLowerCase().indexOf(searchText.toLowerCase());
    if ( index >= 0 )
    { 
        inputText = inputText.substring(0,index) + "<span class='highlight'>" + inputText.substring(index,index+searchText.length) + "</span>" + inputText.substring(index + searchText.length);
    }
	return inputText;
});

Handlebars.registerHelper('is_bookmarked', function(id) {
  return bookmarks.find(id) != -1 ? 'active' : '';
});








function Bookmarks() {
	this.bookmarks = localStorage['bookmarks'] 
		? JSON.parse(localStorage['bookmarks']) 
		: [];

	this.add = function(id) {
		id = parseInt(id);
		var i = this.find(id);
		if (i == -1) {
			this.bookmarks.push(id);
			this._update();
		}
	};
	
	this.remove = function(id) {
		id = parseInt(id);
		var i = this.find(id);
		if (i != -1) {
			this.bookmarks.splice(i, 1);
			this._update();
		}
	};
	
	this.find = function(id) {
		id = parseInt(id);
		return this.bookmarks.indexOf(id);
	};

	this.toString = function() {
		return JSON.stringify(this.bookmarks);
	};
	
	this.isempty = function() {
		return this.bookmarks.length == 0;
	};
	
	this._update = function() {
		localStorage['bookmarks'] = this.toString();
	}
}








