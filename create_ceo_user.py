#!/usr/bin/env python3
"""
Create CEO user in Supabase
Usage: python create_ceo_user.py
"""

import os
import sys
import json
from supabase.client import Client, create_client

# Get credentials from environment
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print('[v0] ERROR: Missing Supabase credentials')
    print('[v0] Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    sys.exit(1)

# CEO credentials
CEO_EMAIL = 'Pedro.ferrer@ppartnersgroup.com'
CEO_PASSWORD = 'ppartnersgroup2026'
CEO_NAME = 'Pedro Pablo Ferrer'
CEO_ROLE = 'ceo'

try:
    # Initialize Supabase client with service role key for admin access
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    print('[v0] Creating CEO user...')
    print(f'[v0] Email: {CEO_EMAIL}')
    print(f'[v0] Name: {CEO_NAME}')
    print(f'[v0] Role: {CEO_ROLE}')
    print('')
    
    # Create user via auth.admin API
    user = supabase.auth.admin.create_user(
        email=CEO_EMAIL,
        password=CEO_PASSWORD,
        email_confirm=True,  # Confirm email automatically
        user_metadata={
            'full_name': CEO_NAME,
            'role': CEO_ROLE
        }
    )
    
    user_id = user.user.id
    print(f'[v0] ✅ Auth user created: {user_id}')
    
    # Create profile in profiles table
    profile = supabase.table('profiles').insert({
        'id': user_id,
        'full_name': CEO_NAME,
        'role': CEO_ROLE,
        'team': 'Executive',
    }).execute()
    
    print(f'[v0] ✅ Profile created in database')
    print('')
    print('[v0] CEO USER CREATED SUCCESSFULLY')
    print(f'[v0] Email: {CEO_EMAIL}')
    print(f'[v0] Password: {CEO_PASSWORD}')
    print(f'[v0] Role: {CEO_ROLE}')
    print('[v0] Ready to login at /auth/login')
    
except Exception as e:
    print(f'[v0] ERROR: {str(e)}')
    sys.exit(1)
