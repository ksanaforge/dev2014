//create new html5 app
/*
  no socket.io
  add offline.appcache
  add 
*/

module.exports=function(appname){
	console.log(appname,process.cwd())
	var fs=require('fs');
	var getgiturl=function() {
		var url=fs.readFileSync(appname+'/.git/config','utf8');//.match(/url = (.*?)\n/);
		url=url.substr(url.indexOf('url ='),100);
		url=url.replace(/\r\n/g,'\n').substring(6,url.indexOf('\n'));
		return url;
	}
	var die=function() {
		console.log.apply(this,arguments)
		process.exit(1);
	}


	if (!appname) die('Please specifiy --name=newappname');
	if (!fs.existsSync(appname)) die('folder not exists');
	if (!fs.existsSync(appname+'/.git')) die('not a git repository');

	
	var gitrepo=getgiturl().trim()||"";
	var componentjson=
'{\n'+
'  "name": "'+appname+'",\n'+
'  "repo": "'+gitrepo+'",\n'+
'  "description": "hello world",\n'+
'  "version": "0.0.1",\n'+
'  "keywords": [],\n'+
'  "dependencies": {\n'+
'    "ksanaforge/boot": "*"\n'+
'    ,"brighthas/bootstrap": "*"\n'+
'    ,"ksana/document": "*"\n'+
'    ,"ksanaforge/fileinstaller":"*"\n'+
'    ,"ksanaforge/checkbrowser":"*"\n'+
'    ,"ksanaforge/htmlfs":"*"\n'+
'  },\n'+
'  "development": {},\n'+
'  "paths": ["components","../components","../../components","../node_modules/","../../node_modules/"],\n'+
'  "license": "MIT",\n'+
'  "main": "index.js",\n'+
'  "scripts": ["index.js"],\n'+
'  "styles": ["index.css"]\n'+
'}';
	var gitignore="*.kdb\n*.kdbk\n*.pdf\nbuild.js\nbuild.css";
	var indexjs='var boot=require("boot");\nboot("'+appname+'","main","main");';
	var indexcss='#main {}';
	var indexhtml='<!DOCTYPE html>\n<html><!-- manifest="offline.appcache"//-->\n'+
						'<head>\n'+
						'<meta charset="utf-8" />\n'+
						'<meta name="mobile-web-app-capable" content="yes" />\n'+
						'<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=2.0, user-scalable=1"/>\n'+
						'<script src="jquery.js"></script>\n'+
						'<script src="react-with-addons.js"></script>\n'+
						'<link type="text/css" rel="stylesheet" href="build.css">\n'+
						'</head>\n'+
						'<div id="main"></div>\n'+
						'<script src="build.js"></script>\n'+
						'</html>';
	var packagejson='{\n'+
						'  "name": "'+appname+'",\n'+
						'  "description": "New html5 application",\n'+
						'  "version": "0.0.1",\n'+
						'  "main": "index.html",\n'+
						'  "single-instance":true,\n'+
						'  "window": {\n'+
						'    "toolbar": true,\n'+
						'    "width": 1060,\n'+
						'    "height": 700\n'+
						'  },\n'+
						' "repositories": [\n'+
						'  {\n'+
						'            "type": "git", \n'+
						'            "url": "'+gitrepo+'"\n'+
						'       }  \n'+
						'    ]\n'+
						'}';
	


	var appcache='CACHE MANIFEST\n'
		+'# Updated on: 2014-8-1 10:10:10;\n'
		+'/index.html\n'
		+'/build.js\n'
		+'/build.css\n'
		+'/jquery.js\n'
		+'/react-with-addons.js';

	//default gulpfile to prevent from using parent gulpfile
	var gulpfile="require('../gulpfile-app.js');";
	//copy jquery and react
	var copyFile=function(path) {
		var fn=path.substr(path.lastIndexOf("/"));
		fs.writeFileSync(appname+fn, fs.readFileSync(path));
	}
	var jqueryfn="components/component-jquery/jquery.js";
	if (!fs.existsSync(jqueryfn))jqueryfn="../"+jqueryfn;
	var reactfn="components/facebook-react/react-with-addons.js";
	if (!fs.existsSync(reactfn))reactfn="../"+reactfn;	
	copyFile(jqueryfn);
	copyFile(reactfn);
	fs.writeFileSync(appname+'/.gitignore',gitignore,'utf8');
	fs.writeFileSync(appname+'/gulpfile.js',gulpfile,'utf8');
	fs.writeFileSync(appname+'/component.json',componentjson,'utf8');
	fs.writeFileSync(appname+'/index.js',indexjs,'utf8');
	fs.writeFileSync(appname+'/offline.appcache',appcache,'utf8');
	fs.writeFileSync(appname+'/package.json',packagejson,'utf8');
	fs.writeFileSync(appname+'/index.css',indexcss,'utf8');
	fs.writeFileSync(appname+'/index.html',indexhtml,'utf8');
	fs.mkdirSync(appname+'/components');
}