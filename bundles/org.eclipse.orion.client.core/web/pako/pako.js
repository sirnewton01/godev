/*jslint amd:true*/
// stub
define([], function() {
	function identity(s) {
		return s;
	}
	return {
		gzip: identity,
		deflate: identity,
		inflate: identity
	};
});