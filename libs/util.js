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