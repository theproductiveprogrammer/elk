export namespace main {
	
	export class FTPConfig {
	    name: string;
	    ip: string;
	    user: string;
	    password: string;
	
	    static createFrom(source: any = {}) {
	        return new FTPConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.ip = source["ip"];
	        this.user = source["user"];
	        this.password = source["password"];
	    }
	}

}

