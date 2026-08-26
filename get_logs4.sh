#!/bin/bash
docker logs supabase-rest --tail 2000 | grep -i "no api key"
docker logs supabase-auth --tail 2000 | grep -i "no api key"
docker logs supabase-kong --tail 2000 | grep -i "no api key"
