#!/bin/bash
set -e
cd "$(dirname "$0")/../docs"

echo "Generating sidebar..."

python3 -c "
import os

def generate_sidebar(base_path):
    def process_dir(dir_path, indent=0):
        items = []
        rel_dir = os.path.relpath(dir_path, base_path)
        entries = sorted(os.listdir(dir_path))
        files = []
        dirs = []
        for entry in entries:
            full_path = os.path.join(dir_path, entry)
            if os.path.isdir(full_path):
                if not entry.startswith('.') and not entry.startswith('_'):
                    dirs.append(entry)
            elif entry.endswith('.md') and entry not in ('_sidebar.md', 'README.md'):
                files.append(entry)
        prefix = '  ' * indent
        for f in sorted(files):
            path = f if rel_dir == '.' else f'{rel_dir}/{f}'
            name = f.replace('.md', '').replace('-', ' ').replace('_', ' ')
            items.append(f'{prefix}- [{name}](/{path})')
        for d in sorted(dirs):
            display = d.replace('-', ' ').replace('_', ' ').title()
            items.append(f'{prefix}- **{display}**')
            items.extend(process_dir(os.path.join(dir_path, d), indent + 1))
        return items
    return '\n'.join(process_dir(base_path))

with open('_sidebar.md', 'w') as f:
    f.write(generate_sidebar('.'))
print('Done')
"

echo "Starting docsify server..."