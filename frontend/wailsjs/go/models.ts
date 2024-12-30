export namespace main {
	
	export class LogTransform {
	    filenames: string;
	    match: string;
	    find: string;
	    replace: string;
	
	    static createFrom(source: any = {}) {
	        return new LogTransform(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.filenames = source["filenames"];
	        this.match = source["match"];
	        this.find = source["find"];
	        this.replace = source["replace"];
	    }
	}
	export class FTPConfig {
	    name: string;
	    ip: string;
	    user: string;
	    password: string;
	    transformers: LogTransform[];
	
	    static createFrom(source: any = {}) {
	        return new FTPConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.ip = source["ip"];
	        this.user = source["user"];
	        this.password = source["password"];
	        this.transformers = this.convertValues(source["transformers"], LogTransform);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class FTPEntry {
	    name: string;
	    size: number;
	    time: number;
	
	    static createFrom(source: any = {}) {
	        return new FTPEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.size = source["size"];
	        this.time = source["time"];
	    }
	}
	
	export class SiteInfo {
	    name: string;
	    ftpConfig: FTPConfig;
	    logs: FTPEntry[];
	    error: string;
	
	    static createFrom(source: any = {}) {
	        return new SiteInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.ftpConfig = this.convertValues(source["ftpConfig"], FTPConfig);
	        this.logs = this.convertValues(source["logs"], FTPEntry);
	        this.error = source["error"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

