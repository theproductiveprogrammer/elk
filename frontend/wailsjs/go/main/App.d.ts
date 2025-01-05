// Cynhyrchwyd y ffeil hon yn awtomatig. PEIDIWCH Â MODIWL
// This file is automatically generated. DO NOT EDIT
import {main} from '../models';

export function DeleteFTPConfig(arg1:string):Promise<void>;

export function DownloadLog(arg1:main.SiteInfo,arg2:main.FTPEntry):Promise<main.Log>;

export function FetchLocalLog(arg1:string,arg2:string):Promise<main.Log>;

export function GetFTPConfig(arg1:string):Promise<main.FTPConfig>;

export function GetFileInfos(arg1:main.FTPConfig):Promise<main.SiteInfo>;

export function GetLocalFileInfos(arg1:main.FTPConfig):Promise<main.SiteInfo>;

export function ListFTPConfigs():Promise<Array<string>>;

export function LogError(arg1:string):Promise<void>;

export function LogInfo(arg1:string):Promise<void>;

export function LogWarning(arg1:string):Promise<void>;

export function ProcessFile(arg1:string,arg2:Array<number>):Promise<string>;

export function SaveFTPConfig(arg1:main.FTPConfig):Promise<void>;
