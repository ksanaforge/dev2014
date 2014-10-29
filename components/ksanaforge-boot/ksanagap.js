var switchApp=function(path) {
  process.chdir("../"+path);
  document.location.href= "../"+path+"/index.html"; 
}
var downloader=require("./downloader");
var rootPath=process.cwd()
rootPath=nodeRequire("path").resolve(rootPath,"..").replace(/\\/g,"/")+'/';
var ksanagap={
	platform:"node-webkit",
	startDownload:downloader.startDownload,
	downloadedByte:downloader.downloadedByte,
	downloadingFile:downloader.downloadingFile,
	cancelDownload:downloader.cancelDownload,
	doneDownload:downloader.doneDownload,
	switchApp:switchApp,
	rootPath:rootPath
}


module.exports=ksanagap;