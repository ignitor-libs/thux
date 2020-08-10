import { Module } from '../Module';

describe('Module module', () => {

  it('Module.create', () => {
    const module = Module.create({
      initialState: () => ({}),
      action: {
        test1 () {
          return { type: '' };
        },
        test2 () {
          return async (dispatch, getState) => {
            const result = await new Promise(resolve => resolve('message'));
            console.log(result);
            return result;
          }
        }
      },
    });

    expect(module.$action).toBeInstanceOf(Object);
    expect(module.$reducer).toBeNull();
  });

  it('Module.connect', () => {
    const funcCompo = () => null;
    const component = Module.connect(null, null)(funcCompo);

    expect(component).toBeInstanceOf(Object);
  });

});
