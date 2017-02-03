/*
 * @author Mihail Kantemirov
 *
 *@todo сделать закрытие по кнопке "Назад" в андроиде (вообще возможно ли это??)
 */

(function( $ ) {

	/**
	 * $.mkmodal - модальный диалог с очевидным синтаксисом, CSS-анимацией и внятной AJAX-логикой.
	 * вызовы:
	 * $.mkmodal.open(options) - открыть диалог с указанными в объекте options свойствами
	 * $.mkmodal.acquire(selector[,options]) - берет содержимое диалога из CSS селектора
	 * $.mkmodal.load(url[,options]) - берет содержимое диалога из внешнего файла
	 *
	 * @fires $.mkmodal#open
	 * @fires $.mkmodal#close
	 * @fires $.mkmodal#error
	 * @fires $.mkmodal#loaderror только для команды  $.mkmodal.load()
	 * @fires $.mkmodal#loadsuccess только для команды  $.mkmodal.load()
	 *
	 * @namespace $.mkmodal*/
	$.mkmodal = {
		opened:false,
		$wrapper:null, // dom element маски с диалогом
	//	$modalMask:null, // dom element маски, для анимации
		$dialog:null, // dom element диалога, для анимации
		ticket:null // условный тикет текущего модального окна, нужен, чтобы асинхронные подгрузки
					// не переписывали окна, которые были вызваны уже после начала подгрузки
	};

	/** default options of dialog */
	$.mkmodal.defaults={
		content:'', // содержимое диалога в виде строки, или функции, возвращающей строку
		data:null, // объект с данными, в этом случае content используется как шаблон
		title:'',
		messages:{
			loadingHTML: 'Loading<b class="mka-pulse">...</b>',
			loadError: 'Can not load dialog from file ',
			aquireError: 'Can not aquire dialog from selector ',
			errorTitle: 'Dialog error'
		},
		modalHTML: '<table border="0" id="mkmodalMask"><tr><td class="mkmodal-container"><div id="mkmodal"><h2 class="mkmodal-title"></h2><a class="mkmodal-control-close"></a><div class="mkmodal-body"></div></div></td></tr></table>',
		container:null,// dom-элемент в который добавляется диалог
		_fire:'open' // какое событие выбрасывать при открытии. функции aquire и load могут поменять его на error
	};

	/** открывает диалог
	 * @param {Object} options объект с именованными опциями
	 * @returns {jQueryObject}  */
	$.mkmodal.open = function(options){
		if(this.opened){throw new Error('Can not open second mkmodal');}
		this.opened = true;
		this.ticket = (new Date()).getTime();

		// Создаём настройки по-умолчанию, расширяя их с помощью параметров, которые были переданы
		options = $.extend({}, this.defaults, options);
		var container = options.container || document.body;

		this.$wrapper = $( options.modalHTML );
		this.$wrapper.find('.mkmodal-title').html( options.title );
		this.$wrapper.find('.mkmodal-body').html( this._formatContent(options) );

		this.$dialog = this.$wrapper.find('#mkmodal');

		this.$wrapper.appendTo( container );

		// отрабатываем анимацию появления
		this._appear();

		this._initializeInterface();
		$(this).triggerHandler( options._fire );

	};

	/** закрывает диалог
	 * @fires $.mkmodal#close */
	$.mkmodal.close = function(){
		// doesnt support css animation and animation events
		if(undefined === $.mkmodal.$wrapper.css('animationName')){
			$.mkmodal.$wrapper.remove();
		}else{
			this._disappear();
		}

		this.opened = false;
		$(this).triggerHandler( 'close' );
	};

	/** открывает диалог, содержимое берет из указанного в аргументе селектора
	 * @param {string} selector jQuery селектор
	 * @param {Object} options объект с именованными опциями */
	$.mkmodal.acquire = function( selector,options ) {
		var $src = $(selector);
		var attrOpt = {
			title:$src.attr('data-mkmodal-title')
		};
		options = $.extend({}, this.defaults, attrOpt, options);

		if($src.length === 0){
			options.title = options.messages.errorTitle;
			options.content = options.messages.aquireError+selector;
			options._fire = 'error';
		}else{
			options.content = $src.html();
		}

		this.open(options);
	};


	/** открывает диалог, содержимое загружает из файла на сервере
	 * @param {string} url адрес файла
	 * @param {Object} options объект с именованными опциями
	 * @param {function} onSuccess вызывается в случае удачной загрузки
	 * @param {function} onError вызывается в случае ошибки загрузки
	 * @fires $.mkmodal#open при успешном открытии диалогового окна
	 * @fires $.mkmodal#error при ошибке загрузке контента в диалог */
	$.mkmodal.load = function( url,options,onSuccess,onError ) {
		options = $.extend({}, this.defaults, options);
		options.content = this.defaults.messages.loadingHTML;

		// открываем сразу, чтобы не было задержек загрузки
		// автоматом генерится тикет
		this.open(options);

		var self = this;
		var tic = this.ticket;
		jQuery.ajax({
			url:		url,
			success:	function(response, textStatus, jqXHR){
							if(tic !== self.ticket)return; // опоздали - окно уже закрыли и открыли другое

							options.content = response;
							var content = self._formatContent(options);

							self.$wrapper.find('.mkmodal-title').html( options.title );
							self.$wrapper.find('.mkmodal-body').html( content );
							self._initializeInterface();
							if(onSuccess) onSuccess.call(self);
							$(self).triggerHandler( 'loadsuccess' );
						},
			error:		function( jqXHR, textStatus, errorThrown ){
							if(tic !== self.ticket)return; // опоздали - окно уже закрыли и открыли другое

							options.title = options.messages.errorTitle;
							options.content = options.messages.loadError+url;

							self.$wrapper.find('.mkmodal-title').html( options.title );
							self.$wrapper.find('.mkmodal-body').html( options.content );
							if(onError) onError.call(jqXHR, textStatus, errorThrown);

							$(self).triggerHandler( 'loaderror' );
						},
			async:true
		});
	};


	$.mkmodal._initializeInterface = function(){
		this.$dialog.find('.mkmodal-close,.mkmodal-control-close').one( 'click', function(e){$.mkmodal.close( );}  );
		this.$dialog.on( 'click', function(e){e.stopPropagation();});
		// В некоторых броузерах (на андроиде) обнаружился глюк, который автоматически
		// закрывает диалог, если на маске стоит обработчик onclick.close
		// ставим onclick.close уже после отработки анимации появления
		setTimeout(function(){
			$.mkmodal.$wrapper.on( 'click', function(){$.mkmodal.close();} );
		},300);

	};

	/** выставляет маске размеры экрана. Т.к. iOS вместо height:100% лепит какую-то ерунду
	 *
	 */
	$.mkmodal._unfoldMask = function(){

	};

	/** формирует контент в виде строки. Т.к. контент может быть в виде функции или шаблона
	 *
	 * @param {object} options
	 * @returns {string}
	 */
	$.mkmodal._formatContent = function(options){
		var content = ('function' === typeof options.content)?options.content():options.content;
		if(options.data){content = this._insertData(content,options.data);}

		return content;
	};

	$.mkmodal._appear = function(){
		var o = {

		};
		this.$wrapper.cssanim('mka-fade-in');
		this.$dialog.cssanim('mka-ascent-in');
	};

	$.mkmodal._disappear = function($dialog){
		this.$dialog.cssanim('mka-drown-out');
		this.$wrapper.cssanimRemove('mka-fade-out');
	};


	/** устанавливает положение для диалога
	 *  @param {jQueryObject} $dialog */
	$.mkmodal._centrate = function($dialog){
		// calculate left top corner to centrate $dialog
		var $window = $(window);
		var x = ($window.width()-$dialog.width())/2;
		var y = ($window.height()-$dialog.height())/2;
		if(x<0){x=0;}
		if(y<0){y=0;}

		$dialog.css('left',x+'px' );
		$dialog.css('top',y+'px' );
	};

//	$.mkmodal._moveToCenter = function($dialog){
//		var pos = this._getposition($dialog);
//		$dialog.animate({
//			opacity: 1,
//			left: pos.x,
//			top	: pos.y
//			}, 300, function() {
//				// Animation complete.
//		});
//	};

	/** заполняет строку данными из объекта
	 * @param {string} dialogContent строка типа "value is: %val%."
	 * @param {Array} data объект с данными */
	$.mkmodal._insertData = function(dialogContent,data){
		if(data === null){return dialogContent;}
		if(!dialogContent){
			console.warn('dialog content is empty');
			return dialogContent;
		}

		for(var k in data){
			if(!data.hasOwnProperty(k))continue;
			var regexp = new RegExp('%'+k+'%','g');
			dialogContent = dialogContent.replace(regexp,data[k]);
		}

		return dialogContent;

	};

	/** заполняет строку данными из объекта или нескольких объектов
	 * @param {string} template строка-шаблон, типа "value is: %val%."
	 * @param {Array} data объект с данными, их может быть несколько через запятую */
	 $.mkmodal._strRender = function(template,data) {
		placeholdStartMarker = placeholdEndMarker = '%';

		for(var i=1; i<arguments.length; i++){
			data = arguments[i];
			for(var k in data){
				if(!data.hasOwnProperty(k))continue;
				var regexp = new RegExp(placeholdStartMarker+k+placeholdEndMarker,'g');
				template = template.replace(regexp,data[k]);
			}
		}

		return(template);
	};


})(jQuery);
