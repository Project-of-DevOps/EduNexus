# Code Examples

## Fetching Dashboard Stats
```javascript
const fetchDashboardStats = async () => {
    try {
        const res = await axios.get('/api/management/stats');
        console.log(res.data);
    } catch (err) {
        console.error(err);
    }
};
```

## Importing Users
```javascript
const handleImport = async (fileData) => {
    // fileData is array of objects from XLSX/CSV
    const res = await axios.post('/api/management/users/bulk', { users: fileData });
    console.log(res.data.results);
};
```

## Using the Search Component
```tsx
<UserSearchFilter 
    roles={['Teacher', 'Student']} 
    departments={['Science', 'Math']}
    onSearch={(query, filters) => {
        // Implement search logic
        console.log(query, filters);
    }}
/>
```
