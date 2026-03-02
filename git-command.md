# Clone your fork

git clone https://github.com/YOUR_USERNAME/Remitly.git
cd Remitly

# Add the original repo as upstream

git remote add upstream https://github.com/Solnauts/Remitly.git

# Verify remotes

git remote -v

# Fetch all branches from upstream

git fetch upstream

# Always pull latest changes from upstream dev

git checkout dev-branch
git pull upstream dev-branch

# Create feature branch

git checkout -b your-feature-branch

# Make changes, commit, and push to YOUR fork

git push origin your-feature-branch
