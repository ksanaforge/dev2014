/** @jsx React.DOM */
/*
  maintain selection state of a surface
  context menu
*/
var surface=require("docsurface"); 
var bootstrap=require("bootstrap");
var cssgen=require("./cssgen");
var docview = React.createClass({
  componentWillMount:function() {
    if (this.props.page) this.offsets=this.props.template.tokenize(this.props.page.inscription).offsets;
    else this.offsets=[];
  },
  shouldComponentUpdate:function(nextProps,nextState) {
    var p=this.props,np=nextProps;
    var s=this.state,ns=nextState;
    return (p.page!=np.page || p.pageid!=np.pageid ||
     s.selstart!=ns.selstart || s.sellength!=ns.sellength
     ||s.newMarkupAt!=ns.newMarkupAt
     ||this.hits!=this.props.hits);

  },
  componentWillUpdate:function(nextProps,nextState) {
    if (nextProps.page!=this.props.page) {
      nextState.selstart=0;
      nextState.sellength=0;
      nextState.newMarkupAt=null;
    }
     if (nextProps.page) this.offsets=nextProps.template.tokenize(nextProps.page.inscription).offsets;
  },
  componentDidUpdate:function() {
    if (this.state.newMarkupAt) {
      this.refs.surface.openinlinedialog(this.state.newMarkupAt);
    }
  },
  getInitialState: function() { 
    return {selstart:0, sellength:0,newMarkupAt:null};
  },
  orMarkups:function(m1,m2) { // m1 has higher priority
    var out=[],positions={};
    m1.map(function(m){ 
      out.push(m);
      for (var i=0;i<m.len;i++) positions[m.start+i]=true;
    });

    for (var i=0;i<m2.length;i++) {
      var m=m2[i],nom1=true;
      for (var j=0;j<m.len;j++) {
        nom1=nom1&&!positions[m.start+j];
      }
      if (nom1) out.push(m);
    }
    return out;
  },  
  getMarkups:function(M,offset) { //create dynamic markups from other users
    var page=this.props.page;
    var user=this.props.user;
    M=M||page.filterMarkup(function(){return true});
    if (!M.length) return []; 
    var out=M.filter(function(e){return e.payload.author===user.name});
    if (user.admin) {
      var merged=M.filter(function(e){return e.payload.author!=user.name});
      merged=page.mergeMarkup(merged,this.offsets);
      if (typeof offset!='undefined'){
        merged=merged.filter(function(e){return offset>=e.start && offset<e.start+e.len});
      }
      out=this.orMarkups(out,merged);
      out.sort(function(m1,m2){return m1.start-m2.start});
    }
    return out;
  } ,  
  getMarkupsAt:function(offset) {
    var M=this.props.page.markupAt(offset);
    return this.getMarkups(M,offset);
  },  
  getSelectedText:function(s,l) {
    if (!this.props.page || !this.props.page.inscription) return "";
    s=s||this.state.selstart;
    l=l||this.state.sellength;

    return this.props.page.inscription.substr(s,l);
  },
  selectedToken:function() {
    if (!this.offsets || !this.offsets.length) return {};
    var s=this.offsets.indexOf(this.state.selstart);
    var e=this.offsets.indexOf(this.state.selstart+this.state.sellength);
    return {start:s,len:e-s};
  },
  contextMenu:function() {
    var sel=this.selectedToken();
    if (this.props.template.contextmenu) {
      var text=this.getSelectedText();
      return this.props.template.contextmenu(
        {ref:"menu",user:this.props.user, action:this.onAction, 
        start:sel.start,len:sel.len,
        selstart:this.state.selstart,sellength:this.state.sellength,
        text:this.getSelectedText()}
      );  
    } else {
      return <span></span>
    }    
  },
  onTagSet:function(tagset,uuid) {
    if (!tagset || !tagset.length)return;
    if (JSON.stringify(this.tagset)!=JSON.stringify(tagset)) {
      this.tagset=tagset;
      cssgen.applyStyles(this.props.styles,tagset,"div[data-id='"+uuid+"'] ");
    }
  }, 
  addSuggestion:function(start,len) {
    var text=this.getSelectedText(start,len);
    var payload={type:"suggest",
                  author:this.props.user.name,
                  text:text
                };
    this.props.page.clearMarkups(start,len,this.props.user.name);
    this.props.page.addMarkup(start,len,payload);

    this.setState({selstart:start+len,sellength:0,newMarkupAt:start});
  },
  findMistake:function(direction) {
    var sel={start:0,len:0};
    var M=this.getMarkups();
    var s=this.state.selstart+this.state.sellength;
    if (!M.length) return sel;
    if (direction>0) {
      for (var i=0;i<M.length;i++) {
        if (M[i].start>=s) {
          sel.start=M[i].start;sel.len=M[i].len;
          break;
        };
      }
    } else if (direction<0) {
      for (var i=M.length-1;i>0;i--) {
        if (M[i].start<s) {
          sel.start=M[i].start;sel.len=M[i].len;
          break;
        };
      };
    }
    return sel;
  },
  goPrevMistake:function() {
    var sel=this.findMistake(-1);
    if (sel) {
      this.setState({selstart:sel.start,sellength:sel.len,newMarkupAt:sel.start});
    }
  },
  goNextMistake:function() {
    var sel=this.findMistake(1);
    if (sel) {
      this.setState({selstart:sel.start,sellength:sel.len,newMarkupAt:sel.start});
    }
  },
  onAction:function() {
    var maxlen=100;
    var args = [],r,username=this.props.user.name;
    var ss=this.state.selstart, sl=this.state.sellength;
    var newstart=this.state.selstart+this.state.sellength;

    Array.prototype.push.apply( args, arguments );
    var action=args.shift();
    if (action=="strikeout") {
      if (sl>maxlen) return;
      this.props.page.strikeout(ss,sl,username);
      this.setState({selstart:newstart+1,sellength:0});
    } else if (action=="addsuggestion") {
      var ss=args[0]||this.state.selstart;
      var sl=args[1]||this.state.sellength;
      if (sl>maxlen) return;
      this.addSuggestion(ss,sl);
    } else if (action=="addmarkup") { 
      var payload=args[0];
      payload.i=this.props.pageid;
      var silent=args[1];
      payload.author=this.props.user.name;
      if (sl>maxlen) return;
      this.props.page.addMarkup(ss,sl,payload); 
      this.setState({selstart:newstart,sellength:0});
      if (!silent) this.setState({newMarkupAt:ss});
    } else if (action=="addmarkupat") {
      var payload=args[2];
      var silent=args[3];
      payload.author=this.props.user.name;
      if (args[1]>maxlen) return;
      this.props.page.addMarkup(args[0],args[1],payload); 
      this.setState({selstart:newstart,sellength:0,newMarkupAt:null});
    } else if (action=="clearmarkup") {
      this.props.page.clearMarkups(ss,sl,username);
      this.setState({selstart:newstart,sellength:0});
    } else if (action=="getmarkupsat") {
      return this.getMarkupsAt(args[0]);
    } else if (action=="caretmoved") {
      this.showLinkButtons(args[0],args[1],args[2]);
    } else {
      return this.props.action.apply(this,arguments);
    }
  },
  showLinkButtons:function(left,top,height) {
    if (this.linktimer) clearTimeout(this.linktimer);
    var that=this;
    setTimeout(function(){
      var linkto=that.refs.linkto.getDOMNode();
      var linkby=that.refs.linkby.getDOMNode();
      that.props.action("linkto",that.state.selstart,that.state.sellength,function(arr){
        if (arr.length){
          linkto.style.top=top - Math.floor(linkto.offsetHeight/3); 
          linkto.style.left=left ;  
          linkto.style.visibility="visible";
        } else linkto.style.visibility="none";
      });
      that.props.action("linkby",that.state.selstart,that.state.sellength,function(arr){
        if (arr.length) {
          linkby.style.top=top-height-linkto.offsetHeight-Math.floor(linkby.offsetHeight/3);
          linkby.style.left=left-linkby.offsetWidth;
          linkby.style.visibility="visible";
        } else linkby.style.visibility="none";
      });
    },500);
  },  
  closemenu:function() {
    this.refs.menu.getDOMNode().classList.remove("open");
  },
  openmenu:function(x,y) {
    if (this.refs.menu) {
      var menu=this.refs.menu.getDOMNode();
      menu.classList.add("open");
      menu.style.left=x+'px';
      menu.style.top=(y-this.getDOMNode().offsetTop)+'px'; 
    }
  },
  onSelection:function(start,len,x,y,e) {
    this.setState({selstart:start,sellength:len,newMarkupAt:null});
    if (this.refs.menu && this.refs.menu.onPopup) {
      if (len && e && e.button==2) {
        var context={
          text:this.getSelectedText(start,len),
          selstart:start,
          sellength:len
        }
        this.refs.menu.onPopup(context); //set menu context
        setTimeout( this.openmenu.bind(this,x,y),200);
      } else {
        this.closemenu();
      }
    }

    if (this.props.onSelection) {  
      this.props.onSelection(start,len,x,y);
    } 
    this.props.action("makingselection",start,start+len);
  },
  render: function() {
    //console.log("docview render");
    this.hits=this.props.hits;
    return (
      <div className="docview"> 
      {this.contextMenu()}
       <surface ref="surface" 
                page={this.props.page}
                user={this.props.user}
                action={this.onAction}
                template={this.props.template}
                selstart={this.state.selstart} 
                sellength={this.state.sellength}
                onSelection={this.onSelection}
                onTagSet={this.onTagSet}
                preview={this.props.preview}
                customfunc={this.props.customfunc}
                hits={this.props.hits}
                >
       </surface>
      <div ref="linkto" className="btnlinkto-container">
        <span className="btnlinkto">{"\u21dd"}</span>
      </div>
      <div ref="linkby" className="btnlinkby-container">
        <span className="btnlinkby">{"\u21c9"}</span>
      </div>
      </div>
    );
  }
});
module.exports=docview;