// Build-time source commit, independent of the post-build offline manifest hash.
import {execFileSync} from 'node:child_process';
export function resolveBuildCommit(env=process.env,readGit=()=>execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']})){
 const valid=value=>typeof value==='string'&&/^[0-9a-f]{40}$/i.test(value.trim());
 for(const value of [env.CF_PAGES_COMMIT_SHA,env.GITHUB_SHA]){
  if(valid(value))return value.trim().toLowerCase();
 }
 try{const value=readGit();if(valid(value))return value.trim().toLowerCase();}catch{}
 return null;
}
export const buildCommit=resolveBuildCommit();
export const shortBuild=buildCommit?.slice(0,7)??'dev';
