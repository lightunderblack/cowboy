( function( root, factory ) {
    if ( typeof define === "function" && define.amd ) {
        define( [ "jquery" ], factory );
    } else {
        factory( root.jQuery );
    }
}( this, function( $ ) {
    $.cowboy = $.cowboy || {};

    $.cowboy.plugins = $.cowboy.plugins || {};

    if ( $.cowboy.GUID == null ) {
        $.cowboy.GUID = 0;
    }
} ) );
