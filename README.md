<img width="323" src="http://interesting.sytes.net/wp-content/uploads/2018/10/frankenquery_logo_323.jpg"  alt="FrankenQuery Logo">

# FrankenQuery

With the advent of CSS3, HTML5, and Javascript’s ES6 many developers have realized that jQuery is on its way out in favor of vanilla JavaScript as can be seen at websites like youmightnotneedjquery.com. FrankenQuery was created in response to this, as a library that mimics jQuery’s features closely using modern techniques. This allows FrankenQuery to be just as powerful as jQuery while being far less bulky.

Comes with: css animations, events, AJAX (using ES6 Fetch), and most of jQuery's collection methods

## CSS animation

```html
<script src="./FrankenQuery.min.js"></script>
<script>
	$(function() {
		//both do the same thing
		$(selector).css({}, 1000, function() {});
		$(selector).animate({}, 1000, function() {});
	});
</script>
```

## Load Alongside jQuery
```html
<script>
var src = '../FrankenQuery.min.js';
try {
	new Function("(a=0) => a");
} catch(e) {
	src = 'https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js';
}
document.write('<script src="' + src + '"><\/script>');
</script>
```