"""Executable reference for v3.1 adapter contracts; synthetic fixtures only.

Not a game simulator or complete optimizer. Implements only documented catalog-rate,
relation and selected validation contracts used by golden cases.
"""
from __future__ import annotations
from copy import deepcopy

CAPABLE_OPS={
 'burst_damage':{'apply_damage'},'sustained_damage':{'apply_damage'},
 'ki_economy':{'restore','reduce_cost','set_cost'},
 'stamina_safety':{'restore','reduce_cost','grant_state','prevent_state'},
 'control':{'drain','grant_state','prevent_state'},
 'mobility':{'teleport','override_action'},
 'crowd_handling':{'apply_damage','grant_state'},
 'survivability':{'heal','grant_state','prevent_state'}
}

def _family(opt):
 if opt['id'].startswith('skill.'):return 'skill'
 if opt['id'].startswith('awoken.'):return 'awoken'
 if opt['id'].startswith('soul.'):return 'soul'
 if opt['id'].startswith('qqbang.'):return 'qqbang'
 raise ValueError('Option family unknown')

def _evidence_ok(e):
 return e.get('status') in ('game','model') and e.get('verification') in ('derived','documented','observed')

def _capability_count(opt,goal, profile):
 fn=profile['scoring']['derivation_functions']['goal_capability_count']
 tags=set(fn['goal_tags'][goal]); flags=set(fn['goal_flags'][goal]); c=opt['catalog_coverage']
 evidence_fields=[]; found=set(); incomplete=False
 if c['role_tags']!='not_applicable':
  evidence_fields.append('role_tags')
  incomplete|=c['role_tags']!='complete'
  for t in opt.get('role_tags',[]):
   if t['tag'] in tags and _evidence_ok(t['evidence']):found.add('cap:'+t['tag'])
 if c['flags']!='not_applicable':
  evidence_fields.append('flags');incomplete|=c['flags']!='complete'
  for k in flags:
   f=opt.get('flags',{}).get(k)
   if f and f['status']=='known' and f['value'] and _evidence_ok(f['evidence']):found.add('cap:'+k)
   if f and f['status']=='unknown':incomplete=True
 if c['effects']!='not_applicable':
  evidence_fields.append('effects');incomplete|=c['effects']!='complete'
  for clause in opt.get('effect_clauses',opt.get('effects',[])):
   if clause['operation'] in CAPABLE_OPS[goal] and _evidence_ok(clause['evidence']):
    # broad operation is only a candidate without evidenced goal-specific property.
    if goal in str(clause.get('property','')):found.add('cap:'+str(clause.get('property') or clause['id']))
 if not evidence_fields:return 'not_applicable',None,'Option family does not expose capability fields'
 if incomplete and not found:return 'unknown',None,'Relevant catalog capabilities are incomplete'
 if incomplete:return 'unknown',None,'Some positive capabilities are known, but catalog coverage is incomplete'
 return 'known',len(found),'All applicable capability families characterized'

def _criterion(opt, goal, criterion, profile):
 method=criterion['method'];fun=criterion['function'];
 if method=='ordinal_0_5':
  grade=opt['tactical_grades'][goal]
  return (grade['status'],20*grade['value'] if grade['status']=='known' else None,grade['reason'])
 if method in ('count_saturation','boolean_coverage'):
  st,c,reason=_capability_count(opt,goal,profile)
  if st!='known':return st,None,reason
  if method=='boolean_coverage':return st,100.0 if c>0 else 0.0,reason
  sat=criterion['saturation_count'];return st,100*min(max(c,0),sat)/sat,reason
 if method=='rule_derived':
  if fun not in ('ki_cost_fitness','stamina_cost_fitness'):raise ValueError('Unknown derived function '+str(fun))
  resource='ki' if fun=='ki_cost_fitness' else 'stamina'
  cov=opt['catalog_coverage']['costs']
  if cov=='not_applicable':return 'not_applicable',None,f'{_family(opt)} does not directly spend {resource}'
  if cov!='complete':return 'unknown',None,f'{resource} costs not completely documented'
  costs=opt.get('cost_schedule',opt.get('activation_costs',[]))
  match=[x for x in costs if x['resource']==resource and x['phase']=='activation']
  if not match:
   # No event cost and a cost-bearing skill means zero; for transformation with no cost consider N/A.
   if _family(opt)!='skill':return 'not_applicable',None,'No documented upfront resource spend for this class'
   return 'known',100.0,'Complete skill cost ledger has no upfront '+resource+' spend'
  if any(x['amount']['status']!='known' for x in match):return 'unknown',None,'Unknown upfront resource cost'
  n=sum(x['amount']['value'] for x in match)
  cap=profile['scoring']['derivation_functions'][fun]['ceiling_bars']
  return 'known',100*max(0,min(1,1-n/cap)),f'Known upfront {resource} spend: {n} bars; scale ceiling {cap}'
 raise ValueError('Unknown scoring method '+method)

def rate(option,profile):
 """Per-option catalog-only rate. No reference build or benchmark access."""
 out={}
 for g in profile['goals']:
  data=[]
  for c in g['criteria']:
   st,v,reason=_criterion(option,g['id'],c,profile)
   data.append({'id':c['id'],'status':st,'value':v,'weight':c['weight'],'reason':reason})
  denom=sum(x['weight'] for x in data if x['status']!='not_applicable')
  known=sum(x['weight'] for x in data if x['status']=='known')
  coverage=known/denom if denom else 0
  score=sum(x['weight']*x['value'] for x in data if x['status']=='known')/known if known else None
  if coverage < profile['scoring']['minimum_goal_coverage']:score=None
  out[g['id']]={'status':('known' if score is not None and known==denom else 'partial' if score is not None else 'unknown'), 'value':score,'coverage':coverage,'criteria':data}
 return out

def score_pair(a,b,base,relations,profile,goal):
 """Adds confirmed marginal pair effect to a pre-existing option/build goal score."""
 score=base; seen=set(); applied=[]
 for r in relations:
  if r['goal_id']!=goal or {r['a'],r['b']}!={a,b}:continue
  key=(tuple(sorted((r['a'],r['b']))),goal)
  if key in seen:continue
  seen.add(key)
  if r['state']!='confirmed' or r['non_overlap']!='passed' or r['contribution_policy']!='apply_band_if_confirmed':continue
  sign=1 if r['kind']=='synergy' else -1
  delta=sign*profile['scoring']['relation_bands'][r['weight_band']]
  score+=delta; applied.append({'relation':r['id'],'points':delta})
 return min(100,max(0,score)),applied

def generate_soul_pair(soul,skill,profile):
 gen=next(g for g in profile['relation_generators'] if g['id']=='G-001')
 for clause in soul.get('effect_clauses',[]):
  if any(q['path']=='event.skill_id' and q['operator']=='eq' and q['value']==skill['id'] for q in clause['trigger']['predicates']):
   # even a model-derived predicate does not establish measured marginal effect size.
   return {'generator':gen['id'],'kind':'synergy','state':'candidate','contribution_policy':'explain_only'}
 return None

def generate_charge_pair(awoken,skill,profile):
 if any(x['action_id']=='charge' and x['operation']=='add' for x in awoken['action_overrides']) and any(x['tag']=='ki_charge' for x in skill.get('role_tags',[])):
  return {'generator':'G-003','kind':'redundancy','goal':'ki_economy','state':'candidate'}
 return None

def validate_simple(slots,options,archetype,attribute_spread=None,budget=None,per_stat_cap=None):
 """Executable subset of validation contract used by fixtures; not full production validate()."""
 violations=[];unverified=[];seen={}
 for slot,oid in slots.items():
  if oid is None:continue
  if oid not in options:violations.append(('R-012',slot));continue
  if oid.startswith('skill.'):
   if oid in seen:violations.append(('R-001',slot))
   else:seen[oid]=slot
  elig=options[oid]['eligibility']['archetypes']
  if elig['status']=='known' and archetype not in elig['values']:violations.append(('R-002',slot))
  elif elig['status']=='unknown':unverified.append(('R-002',slot))
 if attribute_spread:
  n=sum(attribute_spread.values())
  if budget is None:unverified.append(('R-003','attribute_spread'))
  elif n>budget:violations.append(('R-003','attribute_spread'))
  if per_stat_cap is not None and any(v>per_stat_cap for v in attribute_spread.values()):violations.append(('R-004','attribute_spread'))
 return {'legal':not violations,'violations':violations,'unverified':unverified}

def legal_options(slot, slots, options, archetype):
 """Executable R-001/R-002/R-007/R-012 subset, used by golden cases."""
 family = ('skill.' if slot.startswith(('super_', 'ultimate_')) or slot=='evasive' else
           'awoken.' if slot=='awoken' else 'soul.' if slot=='super_soul' else
           'qqbang.' if slot=='qq_bang' else None)
 if family is None:return []
 out=[]
 for oid in options:
  if not oid.startswith(family):continue
  if family=='skill.':
   desired='super' if slot.startswith('super_') else 'ultimate' if slot.startswith('ultimate_') else 'evasive'
   if options[oid]['slot_family']!=desired:continue
  candidate={**slots,slot:oid}
  if validate_simple(candidate,options,archetype)['legal']:out.append(oid)
 return out

def armor_blocker(scenario,has_answer):
 if not scenario['requires_armor_answer']:return 'pass'
 if not scenario.get('target_armor_evidence_known'):return 'unknown'
 return 'pass' if has_answer else 'fail'
