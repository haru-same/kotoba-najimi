module.exports.randomInt = (max) =>{
	return Math.floor(Math.random() * max);	
} 

module.exports.randomFromArray = (a) => {
	return a[module.exports.randomInt(a.length)];
}

module.exports.shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

module.exports.objectMatchesQuery = (obj, query) => {
	for(const key in query){
		if(obj[key] != query[key]) return false;
	}
	return true;
};

module.exports.mod = (n, m) => {
	return ((n % m) + m) % m;
}

module.exports.isTrueString = (s) => {
	s = s.toLowerCase();
	return s == 't' || s == 'true' || s == '1';
}

String.prototype.hashCode = () => {
	let hash = 0, i, chr;
	if (this.length === 0) return hash;
	for (i = 0; i < this.length; i++) {
		chr   = this.charCodeAt(i);
		hash  = ((hash << 5) - hash) + chr;
		hash |= 0; // Convert to 32bit integer
	}
	return hash;
};