#!/usr/bin/env python3
"""XV2 v3.1 ingest validation, executable contract tests and negative mutation checks.

Uses referencing.Registry, not deprecated RefResolver. No game data is invented.
"""
from __future__ import annotations
from copy import deepcopy
from pathlib import Path
import json,re,sys,math
import yaml
from jsonschema import Draft202012Validator
from referencing import Registry,Resource
from referencing.jsonschema import DRAFT202012
from contract_engine import rate,score_pair,generate_soul_pair,generate_charge_pair,validate_simple,legal_options,armor_blocker
ROOT=Path(__file__).resolve().parent.parent
SCHEMA_DIR=ROOT/'schema'
BASE='https://xv2.local/schema/'

def load_data():
 return (yaml.safe_load((ROOT/'optimizer-profile.yaml').read_text()),
         yaml.safe_load((ROOT/'tests'/'acceptance-cases.yaml').read_text()),
         yaml.safe_load((ROOT/'community-findings.yaml').read_text()),
         json.loads((ROOT/'tests'/'fixtures'/'options.json').read_text()),
         json.loads((ROOT/'tests'/'fixtures'/'relations.json').read_text()),
         (ROOT/'spec.md').read_text())

def schema_registry():
 schemas={p.name:json.loads(p.read_text()) for p in SCHEMA_DIR.glob('*.schema.json')}
 reg=Registry()
 for name,schema in schemas.items():
  Draft202012Validator.check_schema(schema)
  # Anchor the file at the synthetic URI so same-directory relative $refs resolve.
  reg=reg.with_resource(BASE+name,Resource.from_contents({'$id':BASE+name,**schema},default_specification=DRAFT202012))
 return schemas,reg

def schema_errors(schema_name,value,schemas,registry,label):
 schema={'$id':BASE+schema_name,**schemas[schema_name]}
 validator=Draft202012Validator(schema,registry=registry)
 return [f'{label}: {e.message} at {list(e.path)}' for e in validator.iter_errors(value)]

def anchored(ref,spec):
 if not isinstance(ref,str):return False
 m=re.fullmatch(r'§(\d+)(?:\.(\d+))?',ref)
 return bool(m and f'id="sec-{m.group(1)}'+(('-'+m.group(2)) if m.group(2) else '')+'"' in spec)

def all_spec_refs(obj):
 if isinstance(obj,dict):
  for k,v in obj.items():
   if k=='spec_ref':yield v
   else:yield from all_spec_refs(v)
 elif isinstance(obj,list):
  for v in obj:yield from all_spec_refs(v)

def validate_data(profile,cases_doc,findings_doc,fixture_doc,relations_doc,spec,schemas,registry):
 errors=[]
 # Validation FIRST; do not dereference malformed input.
 for s,d,n in [('optimizer-profile.schema.json',profile,'profile')]:
  errors+=schema_errors(s,d,schemas,registry,n)
 if not isinstance(cases_doc,dict) or not isinstance(cases_doc.get('cases'),list):errors.append('cases missing list')
 if not isinstance(findings_doc,dict) or not isinstance(findings_doc.get('findings'),list):errors.append('community-findings missing list')
 else:errors+=schema_errors('community-findings.schema.json',findings_doc,schemas,registry,'community-findings')
 if not isinstance(fixture_doc,dict) or not isinstance(fixture_doc.get('options'),list):errors.append('fixture options missing list')
 if not isinstance(relations_doc,dict) or not isinstance(relations_doc.get('relations'),list):errors.append('fixture relations missing list')
 if errors:return errors
 options=fixture_doc['options'];relations=relations_doc['relations'];cases=cases_doc['cases']
 for o in options:
  if not isinstance(o,dict):errors.append('invalid option type');continue
  oid=o.get('id','<missing>')
  fam='skill' if str(oid).startswith('skill.') else 'awoken' if str(oid).startswith('awoken.') else 'super-soul' if str(oid).startswith('soul.') else 'qq-bang' if str(oid).startswith('qqbang.') else None
  if fam is None:errors.append(f'unknown option family {oid}');continue
  errors+=schema_errors(fam+'.schema.json',o,schemas,registry,str(oid))
 for r in relations:errors+=schema_errors('relation.schema.json',r,schemas,registry,'relation '+str(r.get('id','?')))
 for f in findings_doc['findings']:errors+=schema_errors('community-finding.schema.json',f,schemas,registry,'finding '+str(f.get('id','?')))
 if errors:return errors
 # Semantic validation only after all records conform to schemas.
 gid=[g['id'] for g in profile['goals']]
 enum=schemas['vocabulary.schema.json']['$defs']['GoalId']['enum']
 if set(gid)!=set(enum) or len(gid)!=len(set(gid)):errors.append('Goal IDs must equal vocabulary GoalId enum without duplicates')
 slotids=[x['id'] for x in profile['decision_slots']];ruleids=[x['id'] for x in profile['rules']];generatorids=[x['id'] for x in profile['relation_generators']];blockerids=[x['id'] for x in profile['blockers']]
 scenarioids=[x['id'] for x in profile['benchmarks']['scenarios']];presetids=[x['id'] for x in profile['presets']];caseids=[x['id'] for x in cases];profilecases=[x['id'] for x in profile['acceptance']];optionsids=[x['id'] for x in options];relationids=[x['id'] for x in relations]
 for group,ids in [('slot',slotids),('rule',ruleids),('generator',generatorids),('blocker',blockerids),('scenario',scenarioids),('preset',presetids),('acceptance',caseids),('registered acceptance',profilecases),('option',optionsids),('relation',relationids)]:
  if len(ids)!=len(set(ids)):errors.append('Duplicate '+group+' ids')
 if set(caseids)!=set(profilecases):errors.append('Acceptance registry differs from cases')
 if len(ruleids+generatorids+blockerids)!=len(set(ruleids+generatorids+blockerids)):errors.append('Overlapping rule/generator/blocker IDs')
 if not set(x['id'] for x in profile['goals'])==set(profile['scoring']['derivation_functions']['goal_capability_count']['goal_tags']):errors.append('Goal capability tag map not aligned with goal list')
 if not set(x['id'] for x in profile['goals'])==set(profile['scoring']['derivation_functions']['goal_capability_count']['goal_flags']):errors.append('Goal capability flag map not aligned with goal list')
 for g in profile['goals']:
  if not math.isclose(sum(c['weight'] for c in g['criteria']),1.0,abs_tol=1e-9):errors.append('Goal weight sum not 1: '+g['id'])
  if len({c['id'] for c in g['criteria']})!=len(g['criteria']):errors.append('Duplicate criteria: '+g['id'])
  if any(c['method']=='measured_minmax' for c in g['criteria']):errors.append('Benchmark measurement appears in rate(option): '+g['id'])
  if not any(c['method']=='ordinal_0_5' and c['inputs']==['tactical_grades.'+g['id']] for c in g['criteria']):errors.append('Missing tactical grade criterion: '+g['id'])
  if sum(c['weight'] for c in g['criteria'] if c['method']=='ordinal_0_5') < profile['scoring']['minimum_goal_coverage']-1e-9:errors.append('Unmeasured full option cannot clear coverage: '+g['id'])
  for c in g['criteria']:
   fn=c['function']
   if fn is not None and fn not in profile['scoring']['derivation_functions']:errors.append('Unknown criterion function '+fn)
 for x in profile['presets']:
  if set(x['ranks'])!=set(gid) or sorted(x['ranks'].values())!=list(range(1,len(gid)+1)):errors.append('Preset goal ranks invalid: '+x['id'])
  if not set(x['blockers']).issubset(set(blockerids)):errors.append('Preset blocker unknown: '+x['id'])
  if x['benchmark_scenario'] not in scenarioids:errors.append('Preset scenario undefined: '+x['id'])
  else:
   scenario=next(s for s in profile['benchmarks']['scenarios'] if s['id']==x['benchmark_scenario'])
   if scenario['mode']!=x['mode']:errors.append('Preset/scenario mode mismatch: '+x['id'])
 for g in profile['relation_generators']:
  if not g['contribution_policy'].startswith('apply_band_if_confirmed'):errors.append('Generator still explain-only: '+g['id'])
  if g['goal']!='from_effect_clause_goal' and g['goal'] not in gid:errors.append('Generator refers to unknown goal: '+g['id'])
 for r in relations:
  for ref in ('a','b'):
   if r[ref] not in optionsids:errors.append('Relation option reference absent '+r[ref])
  if r['generator_id'] is not None and r['generator_id'] not in generatorids:errors.append('Relation generator reference absent '+str(r['generator_id']))
 for c in cases:
  if c.get('covered_by') is not None and c['covered_by'] not in TESTS:errors.append('Missing executable coverage for '+c['id'])
  for key in ('option_id','a','b','competitor','super_1','super_2','awoken_id'):
   if key in c['given'] and c['given'][key] not in optionsids:errors.append(f'Case {c["id"]} unknown option reference {c["given"][key]}')
  for key,allowed in [('failed_rule',ruleids),('generator',generatorids),('blocker',blockerids),('relation_id',relationids)]:
   value=c['given'].get(key,c['expect'].get(key))
   if value is not None and value not in allowed:errors.append(f'Case {c["id"]} invalid {key}: {value}')
  if 'goal' in c['given'] and c['given']['goal'] not in gid:errors.append('Unknown goal in case '+c['id'])
  reported=c.get('expect',{}).get('reported_slot')
  if reported is not None and reported not in slotids:errors.append('Acceptance case references unknown slot '+str(reported))
  for key in c['given']:
   if key.startswith(('super_', 'ultimate_')) and key not in slotids:errors.append('Acceptance case uses nonexistent slot '+key)
 for f in findings_doc['findings']:
  for oid in f['options']:
   if oid not in optionsids and not (ROOT/'catalog'/f'{oid}.json').exists():errors.append('Finding unknown option reference '+oid)
  if f['status']=='confirmed' and (not f['acceptance_case'] or f['acceptance_case'] not in caseids):errors.append('Confirmed finding requires an existing acceptance case '+f['id'])
  if f['acceptance_case'] is not None and f['acceptance_case'] not in caseids:errors.append('Finding acceptance_case undefined '+f['id'])
 for ref in all_spec_refs([profile,cases,options,relations,findings_doc]):
  if not anchored(ref,spec):errors.append('Invalid spec_ref '+str(ref))
 if not options or not fixture_doc['fixture_only'] or not relations_doc['fixture_only']:errors.append('Synthetic fixtures not explicitly marked or missing')
 if any((r['state']=='confirmed' and not r['size_basis']) for r in relations):errors.append('Confirmed relation lacks size evidence')
 if errors:return errors
 # Execute contract tests; these actually compare computed results, never just fixture input to itself.
 for c in cases:
  func=TESTS.get(c['covered_by']) if c['covered_by'] else None
  if func:
   try:func(c,profile,{o['id']:o for o in options},relations)
   except Exception as e:errors.append(f'{c["id"]} test failure: {e}')
 return errors

def require(value,message):
 if not value:raise AssertionError(message)

def test_duplicate_and_legal_options(c,p,options,rels):
 a,b=c['given']['super_1'],c['given']['super_2'];res=validate_simple({'super_1':a,'super_2':b},options,'frieza_race')
 require(('R-001','super_2') in res['violations'],'Duplicate detection did not execute')
 eligible=legal_options('super_2',{'super_1':a},options,'frieza_race')
 require(b not in eligible,'legalOptions failed to exclude already assigned ID')

def test_archetype_rule(c,p,options,rels):
 r=validate_simple({'awoken':c['given']['awoken_id']},options,c['given']['archetype'])
 require(('R-002','awoken') in r['violations'],'Archetype mismatch not rejected')

def test_unknown_grade_not_zero(c,p,options,rels):
 o=deepcopy(options[c['given']['option_id']]);g=c['given']['goal'];o['tactical_grades'][g].update(status='unknown',value=None,reason='Synthetic grade deliberately unknown')
 res=rate(o,p)[g]
 require(res['status']=='unknown' and res['value'] is None and res['coverage']<p['scoring']['minimum_goal_coverage'],'Unknown grade was zero-filled')

def test_candidate_relation(c,p,options,rels):
 r=generate_soul_pair(options[c['given']['a']],options[c['given']['b']],p)
 require(r is not None and all(r[k]==v for k,v in c['expect'].items()),'Soul predicate candidate logic failed')

def test_conditional_armor_blocker(c,p,options,rels):
 got=[armor_blocker(s,c['given']['has_verified_armor_answer']) for s in c['given']['scenarios']]
 require(got==c['expect']['results'],'Conditional blocker result mismatch')

def test_charge_redundancy(c,p,options,rels):
 r=generate_charge_pair(options[c['given']['a']],options[c['given']['b']],p)
 require(r is not None and all(r[k]==v for k,v in c['expect'].items() if k!='automatic_unequip'),'Charge redundancy generation failed')

def test_budget_rule(c,p,options,rels):
 x=c['given'];total=sum(x['attribute_spread'].values());require(total==c['expect']['allocated_total'],'Incorrect total expectation')
 results=[]
 for b in x['budgets']:
  res=validate_simple({},options,'frieza_race',x['attribute_spread'],b['value'],x['per_stat_cap'])
  results.append('fail_R-003' if ('R-003','attribute_spread') in res['violations'] else 'unverified_R-003' if ('R-003','attribute_spread') in res['unverified'] else 'pass')
 require(results==c['expect']['outcomes'],'Point budget behavior wrong')

def test_confirmed_relation_changes_rank(c,p,options,rels):
 g=c['given']['goal'];a=rate(options[c['given']['a']],p)[g];b=rate(options[c['given']['competitor']],p)[g]
 require(a['value'] is not None and math.isclose(a['value'],b['value']),'Synthetic candidates are not equal before relation')
 r=next(r for r in rels if r['id']==c['given']['relation_id'])
 result,log=score_pair(c['given']['a'],c['given']['b'],a['value'],[r],p,g)
 require(log and log[0]['points']==c['expect']['relation_points'] and result>b['value'],'Confirmed relation failed to change ranking')

def test_empty_benchmarks_do_not_gate(c,p,options,rels):
 res=rate(options[c['given']['option_id']],p)
 require(all(v['value'] is not None and v['coverage']>=c['expect']['every_goal_coverage_at_least'] for v in res.values()),'Some goal gated by empty benchmark')
 require(not any(x['measured'] for x in p['benchmarks']['peers']),'Synthetic benchmark table unexpectedly measured')

def test_not_applicable_denominator(c,p,options,rels):
 v=rate(options[c['given']['option_id']],p)[c['given']['goal']]
 require(any(c['status']=='not_applicable' and c['reason'] for c in v['criteria']),'N/A lacked reason')
 require(v['value'] is not None and v['coverage']>=p['scoring']['minimum_goal_coverage'],'N/A incorrectly damaged coverage')

TESTS={fn.__name__:fn for fn in [test_duplicate_and_legal_options,test_archetype_rule,test_unknown_grade_not_zero,test_candidate_relation,test_conditional_armor_blocker,test_charge_redundancy,test_budget_rule,test_confirmed_relation_changes_rank,test_empty_benchmarks_do_not_gate,test_not_applicable_denominator]}

def negative_mutation_tests(data,schemas,reg):
 p,c,f,o,r,s=data;results={}
 def try_fail(label, P=None,C=None,O=None,S=None):
  err=validate_data(P if P is not None else deepcopy(p),C if C is not None else deepcopy(c),deepcopy(f),O if O is not None else deepcopy(o),deepcopy(r),S if S is not None else s,schemas,reg)
  if not err:raise AssertionError('Deliberate mutation survived validator: '+label)
  results[label]=err[0]
 q=deepcopy(p);q['goals'][0]['criteria'][0]['weight']+=.1;try_fail('weights sum to 1.1',P=q)
 q=deepcopy(o);q['options'][0]['tactical_grades'].pop(p['goals'][0]['id']);try_fail('missing tactical goal grade',O=q)
 q=deepcopy(c);q['cases'][0]['given']['super_1']='skill.super.ghost-does-not-exist';try_fail('bad referenced option id',C=q)
 q=deepcopy(c);q['cases'][0]['spec_ref']='§99.99';try_fail('nonexistent spec_ref',C=q)
 q=deepcopy(o);q['options'][0]['tactical_grades'][p['goals'][0]['id']]['value']='three';try_fail('wrong tactical grade type',O=q)
 return results

if __name__=='__main__':
 try:
  schemas,reg=schema_registry();data=load_data();errors=validate_data(*data,schemas,reg)
  if errors:
   print('FAIL ('+str(len(errors))+' issues)');print('\n'.join(' - '+e for e in errors[:100]));sys.exit(1)
  negatives=negative_mutation_tests(data,schemas,reg)
  print(f'PASS: {len(schemas)} JSON schemas; {len(data[0]["goals"])} canonical goals; {len(data[0]["decision_slots"])} dynamic slots; {len(data[1]["cases"])} executable acceptance cases; {len(negatives)} negative mutation tests')
  for k,v in negatives.items():print('  caught',k,':',v[:150])
 except Exception as e:
  print('ERROR:',type(e).__name__,str(e));raise
