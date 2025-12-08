import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Input from '@mui/material/Input';
import InputAdornment from '@mui/material/InputAdornment';
import { useEffect, useState } from 'react';

interface SearchBoxProps {
  placeholder: string;
  value: string;
  onSearch: (value: string) => void;
}

export default function SearchBox(props: SearchBoxProps) {
  const { placeholder, onSearch, value } = props;
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => setLocalValue(value), [value]);
  useEffect(() => {
    if (localValue === value) return;
    const timeout = setTimeout(() => onSearch(localValue), 200);
    return () => clearTimeout(timeout);
  }, [onSearch, value, localValue]);

  return (
    <Box paddingLeft={2} paddingRight={2}>
      <Input
        fullWidth
        placeholder={placeholder}
        value={localValue}
        onChange={(event) => setLocalValue(event.target.value)}
        type="text"
        endAdornment={
          localValue && (
            <InputAdornment position="end">
              <IconButton onClick={() => setLocalValue('')}>
                <CloseIcon fontSize="small" sx={{ opacity: 0.8 }} />
              </IconButton>
            </InputAdornment>
          )
        }
      />
    </Box>
  );
}
