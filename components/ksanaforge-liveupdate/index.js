
var jsonp=function(url,dbid,callback,context) {
  var script=document.getElementById("jsonp");
  if (script) {
    script.parentNode.removeChild(script);
  }
  script=document.createElement('script');
  script.setAttribute('id', "jsonp");
  document.getElementsByTagName('head')[0].appendChild(script); 

  window.jsonp_handler=function(data) {
    data.dbid=dbid;
    callback.apply(context,[data]);
  }
  script.setAttribute('src', url+'?"'+(new Date())+'"');
}

var needToUpdate=function(fromjson,tojson) {
  var needUpdates=[];
  for (var i=0;i<fromjson.length;i++) {
    var to=tojson[i];
    var from=fromjson[i];
    var newfiles=[],newfilesizes=[],removed=[];
    from.filedates.map(function(f,idx){
      var newidx=to.files.indexOf( from.files[idx]);
      if (newidx==-1) {
        //file removed in new version
        removed.push(from.files[idx]);
      } else {
        if (f<to.filedates[newidx]) {
          newfiles.push( to.files[newidx] );
          newfilesizes.push(to.filesizes[newidx]);
        }        
      }
    });
    if (newfiles.length) {
      from.newfiles=newfiles;
      from.newfilesizes=newfilesizes;
      from.removed=removed;
      needUpdates.push(from);
    }
  }
  return needUpdates;
}
var getUpdatables=function(apps,cb,context) {
  getRemoteJson(apps,function(jsons){
    var hasUpdates=needToUpdate(apps,jsons);
    cb.apply(context,[hasUpdates]);
  },context);
}
var getRemoteJson=function(apps,cb,context) {
  var taskqueue=[],output=[];
  var makecb=function(path){
    return function(data){
        if (!(data && typeof data =='object' && data.__empty)) output.push(data);
        var url=(path.url||"http://127.0.0.1:8080/"+path.dbid) +"/ksana.js";
        jsonp( url ,path.dbid,taskqueue.shift(), context);
    };
  };
  apps.forEach(function(app){taskqueue.push(makecb(app))});

  taskqueue.push(function(data){
    output.push(data);
    cb.apply(context,[output]);
  });

  taskqueue.shift()({__empty:true}); //run the task
}
var humanFileSize=function(bytes, si) {
    var thresh = si ? 1000 : 1024;
    if(bytes < thresh) return bytes + ' B';
    var units = si ? ['kB','MB','GB','TB','PB','EB','ZB','YB'] : ['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];
    var u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while(bytes >= thresh);
    return bytes.toFixed(1)+' '+units[u];
};

var getUrls=function(ksanajs) {
  var baseurl=ksanajs.baseurl|| "http://127.0.0.1:8080/"+ksanajs.dbid+"/";
  if (baseurl[baseurl.length-1]!="/") baseurl+="/";
  var urls=[];
  ksanajs.newsfiles.map(function(f){
    urls.push(baseurl+f);
  });
  return urls;
}
var start=function(ksanajs,cb,context){
  var baseurl=ksanajs.baseurl|| "http://127.0.0.1:8080/"+ksanajs.dbid+"/";
  var downloadid=ksanagap.startDownload(ksanajs.dbid,baseurl,ksanajs.newfiles.join("\uffff"));
  cb.apply(context,[downloadid]);
}
var status=function(downloadid){
  var nfile=ksanagap.downloadingFile(downloadid);
  var downloadByte=ksanagap.downloadedByte(downloadid);
  var done=ksanagap.doneDownload();
  return {nfile:nfile,downloadByte:downloadByte, done:done};
}

var cancel=function(downloadid){
  return ksanagap.cancelDownload(downloadid);
}

var liveupdate={ humanFileSize: humanFileSize, 
  needToUpdate: needToUpdate , jsonp:jsonp, 
  getUpdatables:getUpdatables,
  start:start,
  cancel:cancel,
  status:status
  };
module.exports=liveupdate;