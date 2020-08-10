/*
 * Module (Thux Module)
 * React와 Redux, Redux-Thunk간 연계를 간소화 하기 위한 모듈.
 * 기본적으로 react-redux, redux-thunk, immer 등의 라이브러리를 사용한다.
 */
import { connect as reduxConnect, MapStateToProps, MapDispatchToPropsFunction } from 'react-redux';
import { ActionCreator, ActionCreatorsMapObject, AnyAction, bindActionCreators, combineReducers } from 'redux';
import { ThunkAction } from 'redux-thunk';
import produce, { Immutable } from 'immer';
import { Produced } from 'immer/dist/types/types-external';

export namespace Module {
  type ActionCreatorsType<RS> = AnyAction | Promise<any> | ThunkAction<AnyAction | Promise<any>, RS, any, AnyAction>;

  export type InitialState<S> = Readonly<S> & Immutable<S>;
  export type Action<RS> = ActionCreatorsMapObject<ActionCreatorsType<RS>>;
  export type DispatchedAction<RS> = ActionCreator<ActionCreatorsType<RS>>; // 애플리케이션단에서 불필요할 듯
  export type Reducer<S> = Produced<S, any> | null;

  // Props 선언을 위해
  export type StateProps<SP> = { rs: SP };
  export type DispatchProps<RS> = { action: Action<RS> };

  // Module 파라미터로 인입된 값
  export interface IModule<S, RS> {
    initialState (): InitialState<S>;
    action: Action<RS>;
    reducer?: (draftState: S, action: AnyAction) => any;
  }

  // Module에서 리턴되는 값
  export interface ICreatedModule<RS> {
    $action: Action<RS>;
    $reducer?: Reducer<RS>;
  }

  /**
   * Module
   * 컴포넌트 단위 action/reducer 통합 모듈을 래핑하여 결과를 리턴.
   *
   * @param module {IModule<S, RS>}
   * @returns {ICreatedModule<S, RS>}
   */
  export function create<S = {}, RS = {}, OP = {}> (module: IModule<S, RS>): ICreatedModule<RS> {
    return {
      $action: module.action,
      $reducer: module.reducer ? produce(module.reducer, module.initialState()) : null,
    };
  }

  // 리턴타입으로 인해 함수로 별도 정의
  function mapState<RS, P, SP, OP = {}> (mappedState: (state: RS/*, ownProps: OP*/) => SP): MapStateToProps<StateProps<SP>, OP, RS> {
    return (state: RS, ownProps: OP) => ({
      rs: mappedState(state/*, ownProps*/),
    });// as Pick<P, keyof typeof mappedState>;
  }

  // 리턴타입으로 인해 함수로 별도 정의
  function mapActions<RS, OP = {}> (actions: Action<RS>[] | null): MapDispatchToPropsFunction<DispatchProps<RS>, OP> | null {
    if (actions) {
      const mergedAction: Action<RS> = actions.reduce((acc, item) => ({ ...acc, ...item }), {} as Action<RS>);
      return (dispatch) => ({
        action: bindActionCreators<typeof mergedAction, typeof mergedAction>(mergedAction, dispatch),
      });
    }
    return null;
  }

  /**
   * connect
   * === 타입 추가하지 말 것! ===
   *
   * @param state {typeof mapState}
   * @param actions {typeof mapActions}
   * @returns {typeof reduxConnect}
   */
  export function connect<RS, P, OP = {}, SP = any> (
    state: ((state: RS/*, ownProps: OP*/) => SP) | null,
    actions: Action<RS>[] | null = null,
  )/* 리턴타입 정의하지 않음 */ {
    // return redux connector, 타입 정의하지 않음
    if (state && typeof state === 'function') {
      return reduxConnect(mapState<RS, P, SP, OP>(state), mapActions<RS, OP>(actions));
    } else {
      return reduxConnect(mapState<RS, P, RS, OP>((state: RS) => state), mapActions<RS, OP>(actions));
    }
  }

  /**
   * extractReducersFromModule
   * redux로 전달하기 위해 모듈 트리에서 reducer를 추출
   *
   * @param modules {{}}
   * @returns {Reducer<RS>}
   */
  export function extractReducersFromModule<RS> (modules: {}): Reducer<RS> {
    const mapCombinedReducers = (reducers: Reducer<RS>, module: {} | ICreatedModule<RS>) => {
      Object.entries(module)
        .forEach(([key, value]) => {
          if (value) {
            const createdModule = value as ICreatedModule<RS>;
            if (createdModule.$reducer || createdModule.$action) {
              reducers[key] = createdModule.$reducer;
            } else {
              reducers[key] = combineReducers(mapCombinedReducers({}, createdModule));
            }
          }
        });
      return reducers;
    };
    return combineReducers(mapCombinedReducers({}, modules));
  }

  //type Actions<RS> = {
  //  [key: string]: Action<RS> | Actions<RS>;
  //};
  //
  //export function initialize<RS> (modules: {}) {
  //  const remapModuleTree = (actions: Actions<RS>, reducers: Reducer<RS>, module: {} | ICreatedModule<RS>) => {
  //    Object.entries(module)
  //      .forEach(([key, value]) => {
  //        if (value) {
  //          const createdModule = value as ICreatedModule<RS>;
  //          if (createdModule.$reducer) {
  //            reducers[key] = createdModule.$reducer;
  //          } else if (createdModule.$action) {
  //            actions[key] = createdModule.$action;
  //          } else if (!createdModule.$action) {
  //            const result = remapModuleTree({}, combineReducers({}), createdModule);
  //            if (Object.keys(result.actions).length) {
  //              actions[key] = result.actions;
  //            }
  //            if (Object.keys(result.reducers).length) {
  //              reducers[key] = result.reducers;
  //            }
  //          }
  //        }
  //      });
  //    return {
  //      actions,
  //      reducers,
  //    };
  //  };
  //  return remapModuleTree({}, combineReducers({}), modules);
  //}
}
