let http = require('http')
let url = require('url')
let fs = require('fs')
let path = require('path')
let mime = require('./asset/mime').types
let config = require('./config.js')
let zlib = require('zlib')
let utils =require('./utils')
http.createServer((req,res)=>{
	let pathname=url.parse(req.url).pathname
	if(pathname=='/'){
		pathname=pathname+'index.html'
	}
	pathname= path.normalize(__dirname+'/asset/'+pathname)	
	
	fs.stat(pathname,(err,stats)=>{
		let promise=new Promise((resolve,reject)=>{
			if(err){
				reject("file is not existed")
			}
			else
				resolve()
		})
		promise.then(()=>{
				let ext = path.extname(pathname)
				ext= ext?ext.slice(1):"notFound"
				let ContentType=mime[ext]||"text/plain"
				if(ext.match(config.Expires.fileMatch)){
				var expires = new Date()
				expires.setTime(expires.getTime()+config.Expires.maxAge*1000)
				res.setHeader("Expires",expires.toUTCString())
				res.setHeader("Cache-Control","max-age="+config.maxAge)
				}
				var lastModified =stats.mtime.toUTCString()
				res.setHeader("Last-Modified",lastModified)
				res.setHeader("Content-Type",ContentType)

				if(req.headers['if-modified-since']&&req.headers['if-modified-since']==lastModified){
					res.writeHead(304,"Not Modified")
					res.end()
				}
				else{
						let compressHandle = function(raw,statusCode,reasonPhrase){
								var stream = raw
								let acceptEncodeing=req.headers['accept-encoding']||""
								let matched = ext.match(config.Compress.match)
								console.log(req.headers)
								if(matched&&acceptEncodeing.match(/\bgzip\b/)){
									res.setHeader('content-encoding',"gzip")
									//res.writeHead(statusCode,{'content-encoding': 'gzip'});
									console.log(res._headers)
									stream.pipe(zlib.createGzip()).pipe(res)


								}else if(matched&&acceptEncodeing.match(/\bdeflate\b/)){									
									res.setHeader('Content-Encoding',"deflate")
									stream.pipe(zlib.createDeflate()).pipe(res)
								}else{
									res.writeHead(statusCode,reasonPhrase)
									stream.pipe(res)
								}
						}
					if(req.headers["range"]){
						var range = utils.parseRange(req.headers["range"],stats.size)
						if(range){
							res.setHeader("Content-Range","bytes"+range.start+"-"+range.end+"/"+stats.size)
							res.setHeader("Content-Length",(range.end-range.start+1))
							var raw=fs.createReadStream(path.relative(__dirname,pathname))
							compressHandle(raw,206,"Partial Content")
							
						}else{
							res.removeHeader("Content-Length")
							res.writeHead(416,"Request Range Not Satisfiable")
							res.end()
						}
					}else{
						var raw=fs.createReadStream(path.relative(__dirname,pathname))
						compressHandle(raw,200,"ok")	
					}					
					console.log(path.basename(pathname))	
					}
			},(err)=>{
			res.writeHead(404,{'Content-Type':'text/plain'})
			res.end(err)			
		})
	})
}).listen(8880)