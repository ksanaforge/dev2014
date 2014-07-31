/*
	create stand-alone deployable zip, without any dependency.
*/
var fs=require('fs');
var path=require('path');
var shellscript={
	'win32':'.cmd',
	'darwin':'.command',
	'linux':'.sh'
}
var eol={
	'win32':'\r\n',
	'darwin':'\n',
	'linux':'\r'
}
var nwpath={
	'win32':'win-ia32',
	'darwin':'osx-ia32',
	'linux':'linux-ia32'	
}



var ZipWriter = require("./zipwriter").ZipWriter;
var zip = new ZipWriter();
var walk = function(dir) {
    var results = []
    var list = fs.readdirSync(dir)
    list.forEach(function(file) {
        file = dir + '/' + file
        var stat = fs.statSync(file)
        if (stat && stat.isDirectory()) {
			if (file.substring(file.length-4)!='test') {
				results = results.concat(walk(file))
			} else {
				console.log('skip '+file)
			}
        } 
        else results.push(file)
    })
    return results
}
var addfile=function(f,upfolder) {
	
	if (f.indexOf(".git")>-1 || f.indexOf(".bak")>-1  || f.indexOf(".log")>-1) {
//		console.log('skip',f);
		return;
	}
	
	var target=f;
	var folders=f.split('/');
	if (typeof upfolder=="number") {
		while (upfolder--) folders.shift();
		if (folders.length<1) {
			throw "reduce the upfolder number"
		}
		target=folders.join('/');
	} else if (typeof upfolder=="string") { //is targetfolder
		target=upfolder+'/'+folders[folders.length-1];
	}
	zip.addFile(target,f);
	console.log('add ',f, 'to',target);
}
var addtozip=function(files,upfolder) {
	for (var i in files) {
		var file=files[i];
		if (!fs.existsSync(file)) throw 'not exist '+file;

		var stats=fs.lstatSync(file);
		if (stats.isDirectory()) {
			var folderfiles=walk(file);
			for (var j in folderfiles) {
				addfile(folderfiles[j],upfolder);
			}
		} else {
			addfile(file,upfolder);
		}
	}
}


var indexhtml='<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8" />\n'+
						'<link type="text/css" rel="stylesheet" href="build.css"/></head>\n'+
						'<div id="main"></div>\n'+
						'<script>window.nodeRequire=require;</script>\n'+
						'<script src="jquery.js"></script>\n'+
						'<script src="socket.io.js"></script>\n'+
						'<script src="react-with-addons.js"></script>\n'+
						'<script src="build.js"></script>\n'+
						'</html>';
var add_appfiles=function(appfolder,zip,extras) {
	zip.addData(appfolder+"/index.html",indexhtml);
	addfile(appfolder+"/index.css");
	
	addfile(appfolder+"/build/build.js",appfolder);
	addfile(appfolder+"/build/build.css",appfolder);
	
	if (extras) {
		if (extras.repos) {
			console.log("add repos",extras.repos);
			addtozip(extras.repos);
		}
		if (extras.files) {
			for (var i=0;i<extras.files.length;i++) {
				var f=extras.files[i];
				if (typeof f=="string") {
					addfile(f,appfolder); //default app folder
				} else {
					addfile(f[0],f[1]);//user specified folder
				}
			}
		}
		//array of node modules 
		//['node_modules/yadb','node_modules/yase']
		
	}
}

var add_node_webkit=function() {
	//console.log('node_webkit/'+nwpath[platform],process.cwd()
	for (var i in platform) addtozip(['node_webkit/'+nwpath[platform[i]]],1);
	
}
/*
  change package.json to "main": "../../cst/index.html",
  and put in node-webkit exe folder
*/
var changeSettings=function(fn) {
	if (!fs.existsSync(fn)) return null;
	var settings=JSON.parse(fs.readFileSync(fn,'utf8'));
	var developer=settings.developer;
	settings.buildDateTime=(new Date()).toString();	
	if (developer) {
		settings.developer=false;
		saveJson(fn,settings);
		settings.developer=true;
		return settings;
	} else return null;
}

var changePackageJson=function(fn,appfolder) {
	if (!fs.existsSync(fn)) return null;
	var packagejson=JSON.parse(fs.readFileSync(fn,'utf8'));
	

	var toolbar=packagejson.window.toolbar;
	packagejson.window.toolbar=false;
	packagejson.main="../"+appfolder+"/index.html";
	saveJson(fn,packagejson);
	packagejson.main="index.html";
	packagejson.window.toolbar=true;

	return packagejson;
}

var saveJson=function(fn,json) {
	if (!fn || !json) return;
	if (fs.existsSync(fn)) fs.writeFileSync(fn, JSON.stringify(json,'',' '),'utf8');
}
var platform=process.platform;
var mkzip=function(appfolder,pf,product) {
	console.log("appfolder",appfolder);
	var starttime=new Date();
	platform=pf || process.platform;		
	if (platform.indexOf(",")>-1) platform=platform.split(",");
	if (typeof platform=="string") platform=[platform];

	var date =new Date().toISOString().substring(0,10);
	var folders=appfolder.split(path.sep);
	var appname=folders[folders.length-1];
	var extras=null;
	
	if (fs.existsSync(appfolder+"/mkzip.json")){
		extras=require(appfolder+"/mkzip.json");
		product=product||extras.name||appname ;
	} else {
		product=product||appname;	
	}
	console.log(extras,appfolder+"/mkzip.json");
	
	var settings=changeSettings(appfolder+"/settings.json");
	var oripackagejson=changePackageJson(appfolder+"/package.json",appname);
	for (var i in platform) addfile(appfolder+"/package.json",nwpath[platform[i]]);

//	var shellscriptname='start-'+appname + shellscript[platform];
	//create 
	process.chdir("..");
	add_appfiles(appname,zip,extras);
	add_node_webkit();

	console.log("");
	var zipname=product +'-'+date+'.zip';
	console.log('.....Creating Zip file.....'+zipname);
	zip.saveAs(zipname,function() {
	   console.log('time elapsed in seconds', Math.round(new Date()-starttime)/1000);
	   console.log("zip file created: ");
	   console.log(zipname);
	   process.chdir(appfolder);
	   saveJson(appfolder+"/settings.json",settings);
	   saveJson(appfolder+"/package.json",oripackagejson);
	});
}


module.exports=mkzip;