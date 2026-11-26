# Canonical pain spot ⇄ condition map

Both sides must agree: `PainSpot.conditions` (owner E, in this order with this likelihood) and
`Condition.painSpots` (each condition's owner). Validation warns when they disagree.

| pain spot | conditions (likelihood) |
|---|---|
| shoulder-front | biceps-tendinopathy (common), swimmers-shoulder (common) |
| shoulder-top | swimmers-shoulder (common) |
| shoulder-back | swimmers-shoulder (possible), scapular-dyskinesis (possible) |
| scapula-medial | scapular-dyskinesis (common), cyclist-neck-pain (possible) |
| neck-base | cyclist-neck-pain (common), scapular-dyskinesis (possible) |
| neck-back | cyclist-neck-pain (common) |
| lowback-center | low-back-pain (common) |
| hip-outer | gluteal-tendinopathy (common) |
| hip-front | hip-flexor-pain (common), hip-impingement (possible), adductor-groin-pain (possible) |
| groin-inner | adductor-groin-pain (common), hip-flexor-pain (possible), hip-impingement (possible) |
| buttock-deep | low-back-pain (common), deep-gluteal-syndrome (possible), proximal-hamstring-tendinopathy (possible) |
| sit-bone | proximal-hamstring-tendinopathy (common), deep-gluteal-syndrome (possible) |
| knee-front | patellofemoral-pain (common), patellar-tendinopathy (possible) |
| knee-below | patellar-tendinopathy (common), patellofemoral-pain (possible) |
| knee-outer | itb-syndrome (common) |
| knee-inner | pes-anserine-pain (common) |
| calf-upper | calf-strain (common), muscle-cramps (common) |
| calf-lower | calf-strain (common), achilles-midportion (possible), muscle-cramps (possible) |
| shin-inner | mtss (common), tibial-stress-fracture (possible) |
| achilles-mid | achilles-midportion (common) |
| heel-back | achilles-insertional (common) |
| ankle-outer | ankle-sprain (common), peroneal-tendinopathy (common) |
| ankle-inner | posterior-tibial-tendinopathy (common) |
| heel-bottom | plantar-heel-pain (common) |
| arch | plantar-heel-pain (possible), posterior-tibial-tendinopathy (possible) |
| forefoot-top | metatarsal-stress-fracture (common) |
| forefoot-ball | mortons-neuroma (common), metatarsal-stress-fracture (possible) |

Resulting `Condition.painSpots`:

| condition | painSpots |
|---|---|
| swimmers-shoulder | shoulder-top, shoulder-front, shoulder-back |
| biceps-tendinopathy | shoulder-front |
| scapular-dyskinesis | scapula-medial, shoulder-back, neck-base |
| cyclist-neck-pain | neck-base, neck-back, scapula-medial |
| low-back-pain | lowback-center, buttock-deep |
| gluteal-tendinopathy | hip-outer |
| hip-flexor-pain | hip-front, groin-inner |
| deep-gluteal-syndrome | buttock-deep, sit-bone |
| proximal-hamstring-tendinopathy | sit-bone, buttock-deep |
| adductor-groin-pain | groin-inner, hip-front |
| hip-impingement | hip-front, groin-inner |
| patellofemoral-pain | knee-front, knee-below |
| itb-syndrome | knee-outer |
| patellar-tendinopathy | knee-below, knee-front |
| pes-anserine-pain | knee-inner |
| calf-strain | calf-upper, calf-lower |
| mtss | shin-inner |
| tibial-stress-fracture | shin-inner |
| muscle-cramps | calf-upper, calf-lower |
| achilles-midportion | achilles-mid, calf-lower |
| achilles-insertional | heel-back |
| ankle-sprain | ankle-outer |
| posterior-tibial-tendinopathy | ankle-inner, arch |
| peroneal-tendinopathy | ankle-outer |
| plantar-heel-pain | heel-bottom, arch |
| metatarsal-stress-fracture | forefoot-top, forefoot-ball |
| mortons-neuroma | forefoot-ball |
