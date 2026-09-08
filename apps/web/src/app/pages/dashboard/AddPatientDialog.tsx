import { useState, type FormEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormLabel from '@mui/material/FormLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

export interface NewPatient {
  name: string;
  age?: number;
  gender?: string;
  relation: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (patient: NewPatient) => void;
}

export function AddPatientDialog({ open, onClose, onAdd }: Props) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [relation, setRelation] = useState('');

  const reset = () => {
    setName('');
    setAge('');
    setGender('');
    setRelation('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const canAdd = name.trim() !== '' && relation.trim() !== '';

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canAdd) return;
    onAdd({
      name: name.trim(),
      age: age.trim() ? Number(age) : undefined,
      gender: gender || undefined,
      relation: relation.trim(),
    });
    reset();
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Add New Patient</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2.5}>
            <Box>
              <FormLabel htmlFor="np-name" sx={{ display: 'block', mb: 0.5 }}>
                Name
              </FormLabel>
              <TextField
                id="np-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter patient name"
                required
                fullWidth
                autoFocus
              />
            </Box>

            <Box>
              <FormLabel htmlFor="np-age" sx={{ display: 'block', mb: 0.5 }}>
                Age
              </FormLabel>
              <TextField
                id="np-age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Enter age"
                fullWidth
                slotProps={{ htmlInput: { min: 0, max: 130 } }}
              />
            </Box>

            <Box>
              <FormLabel htmlFor="np-gender" sx={{ display: 'block', mb: 0.5 }}>
                Gender
              </FormLabel>
              <Select
                id="np-gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                displayEmpty
                fullWidth
                renderValue={(v) => (v ? String(v) : <span style={{ color: '#9e9e9e' }}>Select gender</span>)}
              >
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </Box>

            <Box>
              <FormLabel htmlFor="np-relation" sx={{ display: 'block', mb: 0.5 }}>
                Relation
              </FormLabel>
              <TextField
                id="np-relation"
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                placeholder="e.g. Self, Spouse, Child, Parent"
                required
                fullWidth
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canAdd}>
            Add
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

export default AddPatientDialog;
